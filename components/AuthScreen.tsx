"use client"

import { useState } from "react"
import { clearAuth, saveToken } from "~lib/auth"
import { login, register, ApiError } from "~lib/api"
import "~style.css"

type Mode = "signin" | "signup"

type AuthScreenProps = {
  onSuccess: () => void
}

export function AuthScreen({ onSuccess }: AuthScreenProps) {
  const [mode, setMode] = useState<Mode>("signin")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)
    try {
      if (mode === "signup") {
        const { token, user } = await register(email.trim().toLowerCase(), password)
        await saveToken(token, user)
      } else {
        const { token, user } = await login(email.trim().toLowerCase(), password)
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
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex h-[600px] w-[400px] flex-col items-center justify-center overflow-hidden bg-[var(--pv-bg)] px-8">
      <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-[color-mix(in_srgb,var(--pv-accent)_35%,transparent)] bg-[color-mix(in_srgb,var(--pv-accent-soft)_80%,transparent)]">
        <svg
          className="h-7 w-7 text-[var(--pv-accent-strong)]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 2.5l8 3.5v5c0 5.25-3.4 10.2-8 11.5C7.4 21.2 4 16.25 4 11V6l8-3.5z"
          />
        </svg>
      </div>
      <h1 className="mb-1 text-lg font-semibold tracking-tight text-[var(--pv-text)]">
        PromptVault
      </h1>
      <p className="mb-6 text-sm text-[var(--pv-text-muted)]">
        {mode === "signin" ? "Sign in to continue" : "Create an account"}
      </p>

      <form onSubmit={handleSubmit} className="w-full max-w-[280px] space-y-3">
        <label className="block text-xs font-medium text-[var(--pv-text-muted)]">
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="pv-focus mt-1 h-9 w-full rounded-lg border border-[var(--pv-border)] bg-[var(--pv-surface)] px-3 text-xs text-[var(--pv-text)]"
          />
        </label>
        <label className="block text-xs font-medium text-[var(--pv-text-muted)]">
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={mode === "signup" ? 8 : 1}
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            className="pv-focus mt-1 h-9 w-full rounded-lg border border-[var(--pv-border)] bg-[var(--pv-surface)] px-3 text-xs text-[var(--pv-text)]"
          />
        </label>
        {mode === "signup" && (
          <p className="text-[10px] text-[var(--pv-text-muted)]">
            Password must be at least 8 characters
          </p>
        )}
        {error && (
          <div className="rounded-lg border border-red-400/30 bg-red-500/10 p-2 text-xs text-red-400">
            {error}
          </div>
        )}
        <button
          type="submit"
          disabled={isLoading}
          className="pv-button-primary pv-focus h-9 w-full">
          {isLoading ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
        </button>
        <button
          type="button"
          className="pv-button-ghost pv-focus w-full text-center text-xs"
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin")
            setError(null)
          }}>
          {mode === "signin" ? "Create account" : "Already have an account? Sign in"}
        </button>
      </form>
    </div>
  )
}
