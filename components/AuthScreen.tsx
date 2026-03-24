"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { z } from "zod"
import { saveToken } from "~lib/auth"
import { login, register, ApiError } from "~lib/api"
import "~style.css"

type Mode = "signin" | "signup"

type AuthScreenProps = {
  onSuccess: () => void
}

const signInSchema = z.object({
  email: z
    .string()
    .min(1, "Enter your email")
    .email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
})

const signUpSchema = z.object({
  email: z
    .string()
    .min(1, "Enter your email")
    .email("Enter a valid email address"),
  password: z.string().min(8, "Use at least 8 characters"),
})

type FieldErrors = Partial<Record<"email" | "password", string>>

export function AuthScreen({ onSuccess }: AuthScreenProps) {
  const [mode, setMode] = useState<Mode>("signin")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [apiError, setApiError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setApiError(null)

    const schema = mode === "signin" ? signInSchema : signUpSchema
    const parsed = schema.safeParse({ email: email.trim(), password })
    if (!parsed.success) {
      const flat = parsed.error.flatten()
      setFieldErrors({
        email: flat.fieldErrors.email?.[0],
        password: flat.fieldErrors.password?.[0],
      })
      return
    }

    setFieldErrors({})
    setIsLoading(true)
    try {
      if (mode === "signup") {
        const { token, user } = await register(
          parsed.data.email.toLowerCase(),
          parsed.data.password,
        )
        await saveToken(token, user)
      } else {
        const { token, user } = await login(
          parsed.data.email.toLowerCase(),
          parsed.data.password,
        )
        await saveToken(token, user)
      }
      onSuccess()
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Something went wrong"
      setApiError(msg)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex h-[600px] w-[400px] flex-col items-center justify-center overflow-hidden bg-[var(--pv-bg)] px-6">
      <div className="mb-8 w-full max-w-[340px] text-center">
        <h1 className="text-2xl font-bold tracking-[-0.02em] leading-[1.1] text-[var(--pv-text)]">
          PromptVault
        </h1>
        <p className="mt-2 text-sm text-[var(--pv-text-dim)]">
          {mode === "signin" ? "Sign in to continue to your vault" : "Create your account"}
        </p>
      </div>

      <div
        className="w-full max-w-[340px] rounded-xl border border-[var(--pv-border)] bg-[var(--pv-card)] p-8"
        style={{
          boxShadow: "0 0 80px -30px rgba(245, 158, 11, 0.08)",
        }}>
        <form className="flex flex-col gap-5" noValidate onSubmit={handleSubmit}>
          {apiError ? (
            <div
              className="rounded-lg border border-[#F59E0B]/50 bg-[var(--pv-surface-muted)] px-4 py-3 text-sm text-[var(--pv-text)]"
              role="alert">
              {apiError}
            </div>
          ) : null}

          <div className="flex flex-col gap-2">
            <label htmlFor="pv-auth-email" className="text-sm font-medium text-[var(--pv-text)]">
              Email
            </label>
            <input
              id="pv-auth-email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              aria-invalid={fieldErrors.email ? true : undefined}
              aria-describedby={fieldErrors.email ? "pv-auth-email-error" : undefined}
              className="pv-input"
            />
            {fieldErrors.email ? (
              <p id="pv-auth-email-error" className="text-xs text-[#EF4444]" role="alert">
                {fieldErrors.email}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="pv-auth-password" className="text-sm font-medium text-[var(--pv-text)]">
              Password
            </label>
            <input
              id="pv-auth-password"
              name="password"
              type="password"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              aria-invalid={fieldErrors.password ? true : undefined}
              aria-describedby={fieldErrors.password ? "pv-auth-password-error" : undefined}
              className="pv-input"
            />
            {fieldErrors.password ? (
              <p id="pv-auth-password-error" className="text-xs text-[#EF4444]" role="alert">
                {fieldErrors.password}
              </p>
            ) : null}
            {mode === "signup" ? (
              <p className="text-xs text-[var(--pv-text-dim)]">At least 8 characters</p>
            ) : null}
          </div>

          <div className="shimmer-button">
            <button
              type="submit"
              disabled={isLoading}
              className="pv-button-primary pv-focus relative z-[1] h-11 w-full text-sm">
              {isLoading ? (
                <Loader2 className="mx-auto h-5 w-5 animate-spin" aria-hidden />
              ) : mode === "signin" ? (
                "Sign in"
              ) : (
                "Create account"
              )}
            </button>
          </div>
        </form>
      </div>

      <button
        type="button"
        className="pv-button-ghost pv-focus mt-8 w-full max-w-[340px] text-center text-sm"
        onClick={() => {
          setMode(mode === "signin" ? "signup" : "signin")
          setApiError(null)
          setFieldErrors({})
        }}>
        {mode === "signin"
          ? "Need an account? Sign up"
          : "Already have an account? Sign in"}
      </button>
    </div>
  )
}
