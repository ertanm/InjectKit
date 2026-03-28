import { useCallback, useEffect, useState } from "react"

export const TOKEN_STORAGE_KEY = "token" as const

function decodeJwtPayload(token: string): { exp?: number } | null {
  try {
    const parts = token.split(".")
    if (parts.length !== 3 || !parts[1]) {
      return null
    }
    const segment = parts[1]
    const normalized = segment.replace(/-/g, "+").replace(/_/g, "/")
    const padding = (4 - (normalized.length % 4)) % 4
    const padded = normalized + "=".repeat(padding)
    const json = atob(padded)
    const payload = JSON.parse(json) as unknown
    if (typeof payload !== "object" || payload === null) {
      return null
    }
    return payload as { exp?: number }
  } catch {
    return null
  }
}

export async function getToken(): Promise<string | null> {
  try {
    const result = await chrome.storage.local.get(TOKEN_STORAGE_KEY)
    const value = result[TOKEN_STORAGE_KEY]
    return typeof value === "string" ? value : null
  } catch {
    return null
  }
}

export async function setToken(token: string): Promise<void> {
  try {
    await chrome.storage.local.set({ [TOKEN_STORAGE_KEY]: token })
  } catch {
    throw new Error("Failed to save token")
  }
}

export async function clearToken(): Promise<void> {
  try {
    await chrome.storage.local.remove(TOKEN_STORAGE_KEY)
  } catch {
    throw new Error("Failed to clear token")
  }
}

export function isTokenExpired(token: string): boolean {
  const payload = decodeJwtPayload(token)
  if (payload === null || typeof payload.exp !== "number") {
    return true
  }
  return payload.exp * 1000 <= Date.now()
}

export function useAuth(): {
  token: string | null
  loading: boolean
  setToken: (token: string) => Promise<void>
  clearToken: () => Promise<void>
} {
  const [token, setTokenState] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const stored = await getToken()
        if (!cancelled) {
          if (stored && isTokenExpired(stored)) {
            await clearToken()
            setTokenState(null)
          } else {
            setTokenState(stored)
          }
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const listener: Parameters<typeof chrome.storage.onChanged.addListener>[0] = (
      changes,
      areaName
    ) => {
      if (areaName !== "local" || !changes[TOKEN_STORAGE_KEY]) {
        return
      }
      const next = changes[TOKEN_STORAGE_KEY].newValue
      setTokenState(typeof next === "string" ? next : null)
    }
    chrome.storage.onChanged.addListener(listener)
    return () => {
      chrome.storage.onChanged.removeListener(listener)
    }
  }, [])

  const setTokenAndState = useCallback(async (newToken: string) => {
    await setToken(newToken)
    setTokenState(newToken)
  }, [])

  const clearTokenAndState = useCallback(async () => {
    await clearToken()
    setTokenState(null)
  }, [])

  return {
    token,
    loading,
    setToken: setTokenAndState,
    clearToken: clearTokenAndState
  }
}
