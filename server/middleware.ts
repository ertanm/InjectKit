import bcrypt from "bcryptjs"
import type { Request, Response, NextFunction } from "express"
import { verifyToken } from "./auth.js"
import { getPrisma } from "./db.js"

export const DEV_EMAIL = "dev@localhost"
const DEV_PASSWORD_HASH = bcrypt.hashSync("dev", 12)
const isDevEnvironment = process.env.NODE_ENV === "development"

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
      create: { email: DEV_EMAIL, passwordHash: DEV_PASSWORD_HASH },
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
    req.userId = payload.userId
    next()
  } catch {
    res.status(401).json({ error: "Invalid token" })
  }
}
