import bcrypt from "bcryptjs"
import { initPrisma, getPrisma } from "../db.js"
import { DEV_EMAIL } from "../middleware.js"

export async function setupTestDb() {
  await initPrisma()
  return getPrisma()
}

export async function cleanDb() {
  const prisma = getPrisma()
  await prisma.$queryRaw`TRUNCATE TABLE "Prompt", "Space", "User" CASCADE`
}

export async function getOrCreateDevUser() {
  const prisma = getPrisma()
  const hash = bcrypt.hashSync("dev", 12)
  return prisma.user.upsert({
    where: { email: DEV_EMAIL },
    create: { email: DEV_EMAIL, passwordHash: hash },
    update: {},
  })
}

export async function createTestSpace(userId: string, name = "Test Space") {
  const prisma = getPrisma()
  return prisma.space.create({
    data: { name, userId },
  })
}

export async function createTestPrompt(
  spaceId: string,
  overrides: { title?: string; body?: string; tags?: string[] } = {},
) {
  const prisma = getPrisma()
  return prisma.prompt.create({
    data: {
      title: overrides.title ?? "Test Prompt",
      body: overrides.body ?? "Test body content",
      tags: overrides.tags ?? ["test"],
      spaceId,
    },
  })
}
