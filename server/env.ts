import path from "node:path"
import dotenv from "dotenv"
import { z } from "zod"

// Load .env from project root (works for both monorepo and standalone deployment)
dotenv.config({ path: path.join(process.cwd(), ".env") })

const EnvSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  PORT: z
    .string()
    .regex(/^\d+$/, "PORT must be a number")
    .transform((v) => Number(v))
    .optional(),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  CORS_ORIGINS: z.string().optional(),
  ALLOW_DEV_AUTO_AUTH: z
    .enum(["true", "false"])
    .default("false"),
  BASE_URL: z.string().url().optional()
})

export type Env = z.infer<typeof EnvSchema>

let cachedEnv: Env | null = null

export function getEnv(): Env {
  if (cachedEnv) return cachedEnv

  const parsed = EnvSchema.safeParse(process.env)
  if (!parsed.success) {
    // Fail fast on invalid configuration so production never runs
    // with missing or malformed environment variables.
    console.error(
      "Invalid environment configuration:",
      parsed.error.flatten().fieldErrors
    )
    // In tests we still want failures to surface, but many tests
    // stub process.env; let them handle validation explicitly.
    if (process.env.NODE_ENV === "test") {
      throw new Error("Invalid test environment configuration")
    }
    process.exit(1)
  }

  const env = parsed.data

  // Enforce strict CORS in production. Leaving CORS_ORIGINS empty
  // is only allowed in non-production environments.
  if (
    env.NODE_ENV === "production" &&
    (!env.CORS_ORIGINS || env.CORS_ORIGINS.trim() === "")
  ) {
    console.error(
      "CORS_ORIGINS must be set in production. Refusing to start with wide-open CORS."
    )
    process.exit(1)
  }

  cachedEnv = env as Env
  return cachedEnv
}

export function resetEnvCache() {
  cachedEnv = null
}
