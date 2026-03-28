import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { z } from "zod"

const SALT_ROUNDS = 12
const JWT_EXPIRES_IN = "7d"

const jwtPayloadSchema = z.object({
  userId: z.string().min(1),
  tokenVersion: z.number().int().optional(),
})

export type JwtTokenPayload = z.infer<typeof jwtPayloadSchema>

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export function signToken(userId: string, tokenVersion: number = 0): string {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error("JWT_SECRET is not set")
  return jwt.sign({ userId, tokenVersion }, secret, { expiresIn: JWT_EXPIRES_IN })
}

export function verifyToken(token: string): JwtTokenPayload {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error("JWT_SECRET is not set")
  const raw = jwt.verify(token, secret)
  const parsed = jwtPayloadSchema.safeParse(raw)
  if (!parsed.success) throw new Error("Invalid token payload")
  return parsed.data
}
