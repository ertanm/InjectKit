import cors from "cors"
import express from "express"
import type { Request, Response } from "express"
import rateLimit from "express-rate-limit"
import morgan from "morgan"
import { z } from "zod"

import { hashPassword, signToken, verifyPassword } from "./auth.js"
import { analyticsRouter } from "./analytics.js"
import { billingRouter, checkPromptLimit } from "./billing.js"
import { AuthError, resolveUserId } from "./config.js"
import { getPrisma } from "./db.js"
import { importExportRouter } from "./import-export.js"
import { requireAuth } from "./middleware.js"
import {
  createPromptSchema,
  createSpaceSchema,
  paginationSchema,
  updatePromptSchema,
  updateSpaceSchema
} from "./schemas.js"
import { teamsRouter } from "./teams.js"
import { createVersionOnUpdate, versionsRouter } from "./versions.js"
import { getEnv } from "./env.js"
import { Sentry } from "./sentry.js"

const env = getEnv()

const registerSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
})

const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
})

const app = express()
app.disable("etag")

if (process.env.NODE_ENV !== "test") {
  // Log high-level HTTP access details for observability. Avoid logging
  // sensitive request bodies or secrets in application-level logs.
  app.use(morgan("combined"))
}

const allowedOrigins =
  (env.CORS_ORIGINS ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean)

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true)
      }
      if (allowedOrigins.length === 0 && env.NODE_ENV !== "production") {
        // In non-production environments, allow all origins by default to
        // make local development and testing easier.
        return callback(null, true)
      }
      if (allowedOrigins.includes(origin)) {
        return callback(null, true)
      }
      return callback(new Error("Not allowed by CORS"), false)
    }
  })
)
app.use(express.json({ limit: "200kb" }))
app.use("/api", (_req: Request, res: Response, next) => {
  res.setHeader(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate"
  )
  res.setHeader("Pragma", "no-cache")
  res.setHeader("Expires", "0")
  next()
})

app.get("/", (_req: Request, res: Response) => {
  res.send("PromptVault API")
})

app.get("/health", async (_req: Request, res: Response) => {
  try {
    const prisma = getPrisma()
    await prisma.$queryRaw`SELECT 1 as ok`
    res.json({ ok: true, db: "connected" })
  } catch {
    res.status(503).json({ ok: false, db: "error" })
  }
})

// Compatibility health route for clients using /api prefix.
app.get("/api/health", async (_req: Request, res: Response) => {
  try {
    const prisma = getPrisma()
    await prisma.$queryRaw`SELECT 1 as ok`
    res.json({ ok: true, db: "connected" })
  } catch {
    res.status(503).json({ ok: false, db: "error" })
  }
})

if (process.env.NODE_ENV !== "test") {
  app.use(
    "/api/",
    rateLimit({
      windowMs: 60 * 1000,
      max: 100,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: "Too many requests, please try again later" }
    })
  )
}

// ─── Auth (no requireAuth) ───────────────────────────────────

app.post("/api/auth/register", async (req: Request, res: Response) => {
  const parsed = registerSchema.safeParse(req.body)
  if (!parsed.success) {
    const msg = parsed.error.flatten().fieldErrors
    return res.status(400).json({ error: "Validation failed", details: msg })
  }
  const prisma = getPrisma()
  const existing = await prisma.user.findUnique({
    where: { email: parsed.data.email.toLowerCase() },
  })
  if (existing) {
    return res.status(409).json({ error: "Email already registered" })
  }
  const passwordHash = await hashPassword(parsed.data.password)
  const user = await prisma.user.create({
    data: {
      email: parsed.data.email.toLowerCase(),
      passwordHash,
    },
  })
  const token = signToken(user.id)
  return res.status(201).json({
    token,
    user: { id: user.id, email: user.email },
  })
})

app.post("/api/auth/login", async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() })
  }
  const prisma = getPrisma()
  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email.toLowerCase() },
  })
  if (!user) {
    return res.status(401).json({ error: "Invalid email or password" })
  }
  const valid = await verifyPassword(parsed.data.password, user.passwordHash)
  if (!valid) {
    return res.status(401).json({ error: "Invalid email or password" })
  }
  const token = signToken(user.id)
  return res.json({
    token,
    user: { id: user.id, email: user.email },
  })
})

// Protected API routes: require auth (except register, login, health)
app.use("/api", (req: Request, res: Response, next) => {
  const p = req.path
  const isPublic =
    p === "/api/auth/register" ||
    p === "/api/auth/login" ||
    p === "/api/health"
  if (isPublic) return next()
  return requireAuth(req, res, next)
})

app.get("/api/auth/me", async (req: Request, res: Response) => {
  try {
    const userId = resolveUserId(req)
    const prisma = getPrisma()
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { id: true, email: true, plan: true },
    })
    return res.json(user)
  } catch (err) {
    if (err instanceof AuthError) return res.status(401).json({ error: err.message })
    throw err
  }
})

// ─── Spaces ────────────────────────────────────────────────

app.post("/api/spaces", async (req: Request, res: Response) => {
  const parsed = createSpaceSchema.safeParse(req.body)
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "Validation failed", details: parsed.error.flatten() })
  }
  try {
    const userId = await resolveUserId(req)
    const prisma = getPrisma()

    const existing = await prisma.space.findUnique({
      where: { name_userId: { name: parsed.data.name, userId } }
    })
    if (existing) {
      return res
        .status(409)
        .json({ error: "A space with this name already exists" })
    }

    const space = await prisma.space.create({
      data: { name: parsed.data.name, userId }
    })
    return res.status(201).json(space)
  } catch (err) {
    if (err instanceof AuthError)
      return res.status(401).json({ error: err.message })
    return res.status(500).json({ error: "Failed to create space" })
  }
})

app.get("/api/spaces", async (req: Request, res: Response) => {
  try {
    const userId = await resolveUserId(req)
    const prisma = getPrisma()
    const spaces = await prisma.space.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" }
    })
    return res.json(spaces)
  } catch (err) {
    if (err instanceof AuthError)
      return res.status(401).json({ error: err.message })
    return res.status(500).json({ error: "Failed to list spaces" })
  }
})

app.patch("/api/spaces/:id", async (req: Request, res: Response) => {
  const parsed = updateSpaceSchema.safeParse(req.body)
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "Validation failed", details: parsed.error.flatten() })
  }
  try {
    const userId = await resolveUserId(req)
    const prisma = getPrisma()
    const existing = await prisma.space.findFirst({
      where: { id: req.params.id, userId }
    })
    if (!existing) {
      return res.status(404).json({ error: "Space not found" })
    }

    const duplicate = await prisma.space.findFirst({
      where: {
        id: { not: req.params.id },
        userId,
        name: parsed.data.name
      }
    })
    if (duplicate) {
      return res
        .status(409)
        .json({ error: "A space with this name already exists" })
    }

    const space = await prisma.space.update({
      where: { id: req.params.id },
      data: { name: parsed.data.name }
    })
    return res.json(space)
  } catch (err) {
    if (err instanceof AuthError)
      return res.status(401).json({ error: err.message })
    return res.status(500).json({ error: "Failed to update space" })
  }
})

app.delete("/api/spaces/:id", async (req: Request, res: Response) => {
  try {
    const userId = await resolveUserId(req)
    const prisma = getPrisma()
    const existing = await prisma.space.findFirst({
      where: { id: req.params.id, userId }
    })
    if (!existing) {
      return res.status(404).json({ error: "Space not found" })
    }

    const promptCount = await prisma.prompt.count({
      where: { spaceId: req.params.id, deletedAt: null }
    })
    if (promptCount > 0) {
      return res
        .status(409)
        .json({ error: "Cannot delete a space that still has prompts" })
    }

    const memberCount = await prisma.spaceMember.count({
      where: { spaceId: req.params.id }
    })
    if (memberCount > 0) {
      return res
        .status(409)
        .json({ error: "Remove all members before deleting this space" })
    }

    const inviteCount = await prisma.spaceInvite.count({
      where: { spaceId: req.params.id }
    })
    if (inviteCount > 0) {
      return res
        .status(409)
        .json({ error: "Remove pending invites before deleting this space" })
    }

    await prisma.space.delete({
      where: { id: req.params.id }
    })

    return res.status(204).send()
  } catch (err) {
    if (err instanceof AuthError)
      return res.status(401).json({ error: err.message })
    return res.status(500).json({ error: "Failed to delete space" })
  }
})

// ─── Prompts ───────────────────────────────────────────────

app.post("/api/prompts", async (req: Request, res: Response) => {
  const parsed = createPromptSchema.safeParse(req.body)
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "Validation failed", details: parsed.error.flatten() })
  }
  try {
    const userId = await resolveUserId(req)
    const prisma = getPrisma()
    const space = await prisma.space.findFirst({
      where: { id: parsed.data.spaceId, userId }
    })
    if (!space) {
      return res.status(404).json({ error: "Space not found" })
    }
    const withinLimit = await checkPromptLimit(userId)
    if (!withinLimit) {
      return res
        .status(402)
        .json({
          error:
            "Free tier limit reached. Upgrade to Pro to create more prompts."
        })
    }
    const prompt = await prisma.prompt.create({
      data: {
        title: parsed.data.title,
        body: parsed.data.body,
        spaceId: parsed.data.spaceId,
        tags: parsed.data.tags ?? []
      }
    })
    return res.status(201).json(prompt)
  } catch (err) {
    if (err instanceof AuthError)
      return res.status(401).json({ error: err.message })
    return res.status(500).json({ error: "Failed to create prompt" })
  }
})

app.get("/api/spaces/:spaceId/prompts", async (req: Request, res: Response) => {
  const { spaceId } = req.params
  if (!spaceId) {
    return res.status(400).json({ error: "spaceId is required" })
  }
  const pagination = paginationSchema.safeParse(req.query)
  if (!pagination.success) {
    return res
      .status(400)
      .json({
        error: "Invalid pagination",
        details: pagination.error.flatten()
      })
  }
  try {
    const userId = await resolveUserId(req)
    const prisma = getPrisma()
    const space = await prisma.space.findFirst({
      where: { id: spaceId, userId }
    })
    if (!space) {
      return res.status(404).json({ error: "Space not found" })
    }

    const { cursor, limit } = pagination.data
    const prompts = await prisma.prompt.findMany({
      where: { spaceId, deletedAt: null },
      orderBy: { updatedAt: "desc" },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {})
    })

    const hasMore = prompts.length > limit
    const items = hasMore ? prompts.slice(0, limit) : prompts
    const nextCursor = hasMore ? items[items.length - 1]?.id : undefined

    return res.json({ data: items, nextCursor })
  } catch (err) {
    if (err instanceof AuthError)
      return res.status(401).json({ error: err.message })
    return res.status(500).json({ error: "Failed to list prompts" })
  }
})

app.get("/api/prompts/:id", async (req: Request, res: Response) => {
  try {
    const userId = await resolveUserId(req)
    const prisma = getPrisma()
    const prompt = await prisma.prompt.findFirst({
      where: { id: req.params.id, deletedAt: null, space: { userId } }
    })
    if (!prompt) {
      return res.status(404).json({ error: "Prompt not found" })
    }
    return res.json(prompt)
  } catch (err) {
    if (err instanceof AuthError)
      return res.status(401).json({ error: err.message })
    return res.status(500).json({ error: "Failed to get prompt" })
  }
})

app.patch("/api/prompts/:id", async (req: Request, res: Response) => {
  const parsed = updatePromptSchema.safeParse(req.body)
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "Validation failed", details: parsed.error.flatten() })
  }
  if (Object.keys(parsed.data).length === 0) {
    return res.status(400).json({ error: "No fields to update" })
  }
  try {
    const userId = await resolveUserId(req)
    const prisma = getPrisma()
    const existing = await prisma.prompt.findFirst({
      where: { id: req.params.id, deletedAt: null, space: { userId } }
    })
    if (!existing) {
      return res.status(404).json({ error: "Prompt not found" })
    }
    const prompt = await prisma.prompt.update({
      where: { id: req.params.id },
      data: parsed.data
    })
    await createVersionOnUpdate(
      prompt.id,
      prompt.title,
      prompt.body,
      prompt.tags as string[]
    )
    return res.json(prompt)
  } catch (err) {
    if (err instanceof AuthError)
      return res.status(401).json({ error: err.message })
    return res.status(500).json({ error: "Failed to update prompt" })
  }
})

app.delete("/api/prompts/:id", async (req: Request, res: Response) => {
  try {
    const userId = await resolveUserId(req)
    const prisma = getPrisma()
    const existing = await prisma.prompt.findFirst({
      where: { id: req.params.id, deletedAt: null, space: { userId } }
    })
    if (!existing) {
      return res.status(404).json({ error: "Prompt not found" })
    }
    await prisma.prompt.update({
      where: { id: req.params.id },
      data: { deletedAt: new Date() }
    })
    return res.status(204).send()
  } catch (err) {
    if (err instanceof AuthError)
      return res.status(401).json({ error: err.message })
    return res.status(500).json({ error: "Failed to delete prompt" })
  }
})

// ─── Billing ───────────────────────────────────────────────

app.use(billingRouter)

// ─── Versions ──────────────────────────────────────────────

app.use(versionsRouter)

// ─── Teams ─────────────────────────────────────────────────

app.use(teamsRouter)

// ─── Analytics ─────────────────────────────────────────────

app.use(analyticsRouter)

// ─── Import/Export ─────────────────────────────────────────

app.use(importExportRouter)

// Error handler must be last to catch errors from all routes
app.use(
  (err: unknown, _req: Request, res: Response, _next: () => void) => {
    if (Sentry && typeof Sentry.captureException === "function") {
      Sentry.captureException(err)
    }

    if (res.headersSent) {
      return
    }

    console.error("Unhandled application error:", err)
    res.status(500).json({ error: "Internal server error" })
  }
)

export { app }
