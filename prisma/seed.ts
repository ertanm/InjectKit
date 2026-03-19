import path from "node:path"
import { fileURLToPath } from "node:url"
import dotenv from "dotenv"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, "..", ".env") })

async function main() {
  const bcrypt = await import("bcryptjs")
  const { PrismaPg } = await import("@prisma/adapter-pg")
  const mod = await import("../server/generated/prisma/client.js")
  const PrismaClient = mod.PrismaClient
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
  const prisma = new PrismaClient({ adapter })

  const passwordHash = await bcrypt.default.hash("devpassword", 12)
  const user = await prisma.user.upsert({
    where: { email: "dev@localhost" },
    create: { email: "dev@localhost", passwordHash },
    update: {},
  })
  console.log("Seeded dev user for PromptVault (dev@localhost / devpassword)")

  const spaces = await Promise.all(
    ["General", "Code Review", "Creative Writing"].map((name) =>
      prisma.space.upsert({
        where: { name_userId: { name, userId: user.id } },
        create: { name, userId: user.id },
        update: {},
      }),
    ),
  )
  console.log(`Created ${spaces.length} spaces`)

  const prompts = [
    { title: "Code Review Checklist", body: "Review this code for:\n1. Correctness\n2. Edge cases\n3. Performance\n4. Readability\n5. Security concerns", tags: ["review", "checklist"], spaceId: spaces[1].id },
    { title: "Explain Like I'm 5", body: "Explain the following concept in simple terms, as if explaining to a 5-year-old. Use analogies and avoid jargon.", tags: ["explain", "simple"], spaceId: spaces[0].id },
    { title: "Refactor for Readability", body: "Refactor this code to improve readability without changing behavior. Focus on naming, structure, and reducing complexity.", tags: ["refactor", "clean-code"], spaceId: spaces[1].id },
    { title: "Write Unit Tests", body: "Write comprehensive unit tests for the following function. Cover happy path, edge cases, and error scenarios. Use the testing framework already in use.", tags: ["testing", "unit-test"], spaceId: spaces[1].id },
    { title: "Blog Post Draft", body: "Write a blog post about the following topic. Use a conversational tone, include code examples where relevant, and keep it under 1000 words.", tags: ["writing", "blog"], spaceId: spaces[2].id },
    { title: "Debug This Error", body: "I'm getting the following error. Help me debug it step by step:\n1. Identify the root cause\n2. Explain why it happens\n3. Provide a fix\n4. Suggest how to prevent it", tags: ["debug", "error"], spaceId: spaces[0].id },
    { title: "API Endpoint Design", body: "Design a REST API endpoint for the following feature. Include: method, path, request body schema, response schema, status codes, and error cases.", tags: ["api", "design"], spaceId: spaces[1].id },
    { title: "Product Description", body: "Write a compelling product description for the following item. Highlight benefits over features. Keep it concise and persuasive.", tags: ["writing", "marketing"], spaceId: spaces[2].id },
    { title: "SQL Query Helper", body: "Write an optimized SQL query for the following requirement. Explain the query plan and suggest indexes if needed.", tags: ["sql", "database"], spaceId: spaces[0].id },
    { title: "Story Outline", body: "Create a story outline with: premise, main character, conflict, three act structure, and a satisfying resolution.", tags: ["writing", "creative"], spaceId: spaces[2].id },
  ]

  for (const p of prompts) {
    await prisma.prompt.create({ data: p })
  }
  console.log(`Created ${prompts.length} prompts`)

  await prisma.$disconnect()
}

main().catch((err) => {
  console.error("Seed failed:", err)
  process.exit(1)
})
