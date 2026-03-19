import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"

const SALT_ROUNDS = 12
const JWT_EXPIRES_IN = "7d"

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export function signToken(userId: string): string {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error("JWT_SECRET is not set")
  return jwt.sign({ userId }, secret, { expiresIn: JWT_EXPIRES_IN })
}

export function verifyToken(token: string): { userId: string } {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error("JWT_SECRET is not set")
  const payload = jwt.verify(token, secret) as { userId: string }
  if (!payload.userId) throw new Error("Invalid token payload")
  return { userId: payload.userId }
}
