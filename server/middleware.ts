import bcrypt from "bcryptjs"
import type { Request, Response, NextFunction } from "express"
import { verifyToken } from "./auth.js"
import { getPrisma } from "./db.js"

export const DEV_EMAIL = "dev@localhost"
const isDevEnvironment = process.env.NODE_ENV === "development"

/** Lazily computed so bcrypt.hashSync only runs in dev, not on every prod startup. */
let _devPasswordHash: string | null = null
function getDevPasswordHash(): string {
  if (!_devPasswordHash) {
    _devPasswordHash = bcrypt.hashSync("dev", 12)
  }
  return _devPasswordHash
}

function isLocalRequest(req: Request): boolean {
  const ip = req.ip ?? ""
  return ip === "127.0.0.1" || ip === "::1" || ip === "::ffff:127.0.0.1"
}

declare global {
  namespace Express {
    interface Request {
      userId?: string
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (
    isDevEnvironment &&
    process.env.ALLOW_DEV_AUTO_AUTH === "true" &&
    isLocalRequest(req)
  ) {
    const prisma = getPrisma()
    const user = await prisma.user.upsert({
      where: { email: DEV_EMAIL },
      create: { email: DEV_EMAIL, passwordHash: getDevPasswordHash() },
      update: {},
    })
    req.userId = user.id
    return next()
  }

  const header = req.headers.authorization
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" })
    return
  }
  try {
    const token = header.slice(7)
    const payload = verifyToken(token)

    // Check tokenVersion against DB to support token revocation
    const prisma = getPrisma()
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { tokenVersion: true },
    })
    if (!user || (payload.tokenVersion ?? 0) < user.tokenVersion) {
      res.status(401).json({ error: "token_revoked" })
      return
    }

    req.userId = payload.userId
    next()
  } catch {
    res.status(401).json({ error: "invalid_token" })
  }
}
