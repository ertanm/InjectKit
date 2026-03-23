import { describe, it, expect, beforeAll } from "vitest"
import request from "supertest"
import { app } from "../app.js"
import { setupTestDb } from "./helpers.js"

beforeAll(async () => {
  await setupTestDb()
})

describe("Legal and billing landing pages", () => {
  it("serves privacy policy as HTML", async () => {
    const res = await request(app).get("/privacy")
    expect(res.status).toBe(200)
    expect(res.headers["content-type"]).toMatch(/html/)
    expect(res.text).toMatch(/Privacy Policy|PromptVault/)
  })

  it("serves terms of service as HTML", async () => {
    const res = await request(app).get("/terms")
    expect(res.status).toBe(200)
    expect(res.headers["content-type"]).toMatch(/html/)
    expect(res.text).toMatch(/Terms of Service/)
  })

  it("serves Stripe return pages as HTML", async () => {
    const ok = await request(app).get("/billing/success")
    expect(ok.status).toBe(200)
    expect(ok.text).toMatch(/Thank you|subscription/i)
    const cancel = await request(app).get("/billing/cancel")
    expect(cancel.status).toBe(200)
    expect(cancel.text).toMatch(/canceled/i)
  })
})
