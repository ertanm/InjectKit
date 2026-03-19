import { describe, it, expect, beforeAll, afterEach, vi } from "vitest"
import request from "supertest"
import { setupTestDb, cleanDb } from "./helpers.js"

beforeAll(async () => {
  await setupTestDb()
})

afterEach(async () => {
  await cleanDb()
})

describe("Security configuration", () => {
  it("rejects requests from unknown origins via CORS", async () => {
    const originalCors = process.env.CORS_ORIGINS
    process.env.CORS_ORIGINS = "https://allowed.com"

    vi.resetModules()
    const { initPrisma } = await import("../db.js")
    await initPrisma()
    const { app: corsApp } = await import("../app.js")

    const res = await request(corsApp)
      .get("/health")
      .set("Origin", "https://evil.com")

    expect(res.status).toBe(500)

    process.env.CORS_ORIGINS = originalCors
  })

  it("does not allow unauthenticated access", async () => {
    const { resolveUserId, AuthError } = await import("../config.js")
    const req = { userId: undefined } as any

    expect(() => resolveUserId(req)).toThrow(AuthError)
  })
})

