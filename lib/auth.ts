/** Canonical JWT key (see `popup/hooks/useAuth.ts`). */
const TOKEN_KEY = "token"
const LEGACY_TOKEN_KEY = "injectkit:token"
const USER_KEY = "injectkit:user"

export async function saveToken(token: string, user: { id: string; email: string }): Promise<void> {
  try {
    await chrome.storage.local.set({
      [TOKEN_KEY]: token,
      [LEGACY_TOKEN_KEY]: token,
      [USER_KEY]: user,
    })
  } catch {
    throw new Error("Failed to save session")
  }
}

export async function getToken(): Promise<string | null> {
  try {
    const result = await chrome.storage.local.get([TOKEN_KEY, LEGACY_TOKEN_KEY])
    const next = result[TOKEN_KEY]
    if (typeof next === "string") {
      return next
    }
    const legacy = result[LEGACY_TOKEN_KEY]
    return typeof legacy === "string" ? legacy : null
  } catch {
    return null
  }
}

export async function getUser(): Promise<{ id: string; email: string } | null> {
  try {
    const result = await chrome.storage.local.get(USER_KEY)
    return result[USER_KEY] ?? null
  } catch {
    return null
  }
}

/**
 * Decode a JWT payload without signature verification.
 * Shared trust model with `useAuth` — the server is the authority.
 */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".")
    if (parts.length !== 3 || !parts[1]) return null
    const segment = parts[1]
    const normalized = segment.replace(/-/g, "+").replace(/_/g, "/")
    const padding = (4 - (normalized.length % 4)) % 4
    const padded = normalized + "=".repeat(padding)
    const json = atob(padded)
    const payload = JSON.parse(json) as unknown
    if (typeof payload !== "object" || payload === null) return null
    return payload as Record<string, unknown>
  } catch {
    return null
  }
}

export function getUserIdFromToken(token: string): string | null {
  const payload = decodeJwtPayload(token)
  if (!payload) return null
  const userId = payload.userId
  return typeof userId === "string" && userId.length > 0 ? userId : null
}

function isTokenExpired(token: string): boolean {
  const payload = decodeJwtPayload(token)
  if (!payload || typeof payload.exp !== "number") return true
  return payload.exp * 1000 <= Date.now()
}

export async function clearAuth(): Promise<void> {
  try {
    await chrome.storage.local.remove([
      TOKEN_KEY,
      LEGACY_TOKEN_KEY,
      USER_KEY,
    ])
  } catch {
    // ignore
  }
}

export async function isLoggedIn(): Promise<boolean> {
  const token = await getToken()
  if (!token) return false
  if (isTokenExpired(token)) {
    await clearAuth()
    return false
  }
  return true
}
