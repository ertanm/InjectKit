import type { Request } from "express"

export class AuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "AuthError"
  }
}

export function resolveUserId(req: Request): string {
  if (!req.userId) {
    throw new AuthError("Unauthorized")
  }
  return req.userId
}
