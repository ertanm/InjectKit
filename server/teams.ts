import crypto from "node:crypto"
import { Router } from "express"
import type { Request, Response } from "express"
import { z } from "zod"
import { getPrisma } from "./db.js"
import { resolveUserId, AuthError } from "./config.js"

export const teamsRouter = Router()

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["EDITOR", "VIEWER"]).default("VIEWER"),
})

const updateRoleSchema = z.object({
  role: z.enum(["EDITOR", "VIEWER"]),
})

teamsRouter.post("/api/spaces/:id/invites", async (req: Request, res: Response) => {
  const parsed = inviteSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() })
  }
  try {
    const userId = await resolveUserId(req)
    const prisma = getPrisma()

    const space = await prisma.space.findFirst({
      where: { id: req.params.id, userId },
    })
    if (!space) {
      return res.status(404).json({ error: "Space not found or you are not the owner" })
    }

    const token = crypto.randomBytes(32).toString("hex")
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000)

    const invite = await prisma.spaceInvite.create({
      data: {
        spaceId: req.params.id,
        email: parsed.data.email,
        role: parsed.data.role,
        token,
        expiresAt,
      },
    })

    return res.status(201).json({
      id: invite.id,
      email: invite.email,
      role: invite.role,
      token: invite.token,
      expiresAt: invite.expiresAt,
    })
  } catch (err) {
    if (err instanceof AuthError) return res.status(401).json({ error: err.message })
    return res.status(500).json({ error: "Failed to create invite" })
  }
})

teamsRouter.post("/api/invites/:token/accept", async (req: Request, res: Response) => {
  try {
    const userId = await resolveUserId(req)
    const prisma = getPrisma()

    const invite = await prisma.spaceInvite.findUnique({
      where: { token: req.params.token },
    })
    if (!invite) {
      return res.status(404).json({ error: "Invite not found" })
    }
    if (invite.status !== "PENDING") {
      return res.status(400).json({ error: "Invite already used or expired" })
    }
    if (invite.expiresAt < new Date()) {
      await prisma.spaceInvite.update({
        where: { id: invite.id },
        data: { status: "EXPIRED" },
      })
      return res.status(400).json({ error: "Invite has expired" })
    }

    await prisma.$transaction([
      prisma.spaceMember.upsert({
        where: { spaceId_userId: { spaceId: invite.spaceId, userId } },
        create: { spaceId: invite.spaceId, userId, role: invite.role },
        update: { role: invite.role },
      }),
      prisma.spaceInvite.update({
        where: { id: invite.id },
        data: { status: "ACCEPTED" },
      }),
    ])

    return res.json({ message: "Invite accepted" })
  } catch (err) {
    if (err instanceof AuthError) return res.status(401).json({ error: err.message })
    return res.status(500).json({ error: "Failed to accept invite" })
  }
})

teamsRouter.get("/api/spaces/:id/members", async (req: Request, res: Response) => {
  try {
    const userId = await resolveUserId(req)
    const prisma = getPrisma()

    const space = await prisma.space.findFirst({
      where: {
        id: req.params.id,
        OR: [{ userId }, { members: { some: { userId } } }],
      },
    })
    if (!space) {
      return res.status(404).json({ error: "Space not found" })
    }

    const members = await prisma.spaceMember.findMany({
      where: { spaceId: req.params.id },
      orderBy: { createdAt: "asc" },
    })

    const owner = { userId: space.userId, role: "OWNER" as const }
    type Member = (typeof members)[number]
    return res.json([owner, ...members.map((m: Member) => ({ userId: m.userId, role: m.role }))])
  } catch (err) {
    if (err instanceof AuthError) return res.status(401).json({ error: err.message })
    return res.status(500).json({ error: "Failed to list members" })
  }
})

teamsRouter.delete("/api/spaces/:id/members/:memberId", async (req: Request, res: Response) => {
  try {
    const userId = await resolveUserId(req)
    const prisma = getPrisma()

    const space = await prisma.space.findFirst({
      where: { id: req.params.id },
    })
    if (!space) {
      return res.status(404).json({ error: "Space not found" })
    }

    const isOwner = space.userId === userId
    const isSelfRemoval = req.params.memberId === userId

    // Owner cannot remove themselves — must transfer ownership or delete the space
    if (isOwner && isSelfRemoval) {
      return res.status(400).json({ error: "Owner cannot leave. Transfer ownership or delete the space." })
    }

    // Only the owner can remove other members; non-owners can only remove themselves
    if (!isOwner && !isSelfRemoval) {
      return res.status(403).json({ error: "Only the space owner can remove members" })
    }

    const member = await prisma.spaceMember.findFirst({
      where: { spaceId: req.params.id, userId: req.params.memberId },
    })
    if (!member) {
      return res.status(404).json({ error: "Member not found" })
    }

    await prisma.spaceMember.delete({ where: { id: member.id } })

    return res.status(204).send()
  } catch (err) {
    if (err instanceof AuthError) return res.status(401).json({ error: err.message })
    return res.status(500).json({ error: "Failed to remove member" })
  }
})

teamsRouter.patch("/api/spaces/:id/members/:memberId", async (req: Request, res: Response) => {
  const parsed = updateRoleSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() })
  }
  try {
    const userId = await resolveUserId(req)
    const prisma = getPrisma()

    const space = await prisma.space.findFirst({
      where: { id: req.params.id, userId },
    })
    if (!space) {
      return res.status(403).json({ error: "Only the space owner can update roles" })
    }

    const member = await prisma.spaceMember.findFirst({
      where: { spaceId: req.params.id, userId: req.params.memberId },
    })
    if (!member) {
      return res.status(404).json({ error: "Member not found" })
    }

    const updated = await prisma.spaceMember.update({
      where: { id: member.id },
      data: { role: parsed.data.role },
    })

    return res.json({ userId: updated.userId, role: updated.role })
  } catch (err) {
    if (err instanceof AuthError) return res.status(401).json({ error: err.message })
    return res.status(500).json({ error: "Failed to update role" })
  }
})
