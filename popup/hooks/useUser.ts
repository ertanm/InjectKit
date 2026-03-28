import { useEffect, useRef, useState } from "react"
import { parseInjectKitUser, type InjectKitUser } from "~lib/popup-validation"
import { clearToken, getToken, TOKEN_STORAGE_KEY } from "./useAuth"

const USER_CACHE_KEY = "injectkit_user" as const

export type { InjectKitUser }

async function readUserCache(): Promise<InjectKitUser | null> {
  try {
    const result = await chrome.storage.local.get(USER_CACHE_KEY)
    const raw = result[USER_CACHE_KEY]
    if (typeof raw !== "string") {
      return null
    }
    const parsed: unknown = JSON.parse(raw)
    return parseInjectKitUser(parsed)
  } catch {
    return null
  }
}

async function writeUserCache(user: InjectKitUser): Promise<void> {
  try {
    await chrome.storage.local.set({ [USER_CACHE_KEY]: JSON.stringify(user) })
  } catch {
    // ignore persistence failures
  }
}

async function clearUserCache(): Promise<void> {
  try {
    await chrome.storage.local.remove(USER_CACHE_KEY)
  } catch {
    // ignore
  }
}

async function parseResponseError(res: Response): Promise<string> {
  try {
    const text = await res.text()
    if (!text) {
      return `Request failed (${res.status})`
    }
    try {
      const data: unknown = JSON.parse(text)
      if (typeof data === "object" && data !== null && "message" in data) {
        const m = (data as { message: unknown }).message
        if (typeof m === "string") {
          return m
        }
      }
    } catch {
      return text.slice(0, 200)
    }
    return `Request failed (${res.status})`
  } catch {
    return `Request failed (${res.status})`
  }
}

function apiBase(): string | null {
  const base = process.env.PLASMO_PUBLIC_API_URL
  if (typeof base !== "string" || base.length === 0) {
    return null
  }
  return base.replace(/\/$/, "")
}

export function useUser(): {
  user: InjectKitUser | null
  loading: boolean
  error: string | null
} {
  const [user, setUser] = useState<InjectKitUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const fetchSeq = useRef(0)

  useEffect(() => {
    const run = async () => {
      const seq = ++fetchSeq.current

      const token = await getToken()
      const cached = await readUserCache()

      if (seq !== fetchSeq.current) {
        return
      }

      if (!token) {
        setUser(null)
        await clearUserCache()
        setError(null)
        setLoading(false)
        return
      }

      if (cached) {
        setUser(cached)
        setLoading(false)
      } else {
        setLoading(true)
      }

      setError(null)

      const base = apiBase()
      if (!base) {
        setError("API URL is not configured")
        setLoading(false)
        return
      }

      try {
        const res = await fetch(`${base}/me`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: AbortSignal.timeout(10_000),
        })

        if (seq !== fetchSeq.current) {
          return
        }

        if (res.status === 401) {
          const body = await res.json().catch(() => ({}))
          const errorCode = (body as { error?: string }).error
          // Only clear token for definitive auth failures, not transient issues
          if (errorCode === "invalid_token" || errorCode === "token_revoked" || errorCode === "Unauthorized") {
            try {
              await clearToken()
            } catch {
              // ignore
            }
            await clearUserCache()
            setUser(null)
          } else {
            setError(errorCode ?? "Authentication error")
          }
          setLoading(false)
          return
        }

        if (!res.ok) {
          setError(await parseResponseError(res))
          setLoading(false)
          return
        }

        let json: unknown
        try {
          json = await res.json()
        } catch {
          setError("Invalid response")
          setLoading(false)
          return
        }

        const parsed = parseInjectKitUser(json)
        if (!parsed) {
          setError("Invalid response")
          setLoading(false)
          return
        }

        if (seq !== fetchSeq.current) {
          return
        }

        setUser(parsed)
        await writeUserCache(parsed)
      } catch {
        if (seq === fetchSeq.current) {
          setError("Network error")
        }
      } finally {
        if (seq === fetchSeq.current) {
          setLoading(false)
        }
      }
    }

    void run()

    const listener: Parameters<typeof chrome.storage.onChanged.addListener>[0] = (
      changes,
      areaName
    ) => {
      if (areaName !== "local" || !changes[TOKEN_STORAGE_KEY]) {
        return
      }
      void run()
    }

    chrome.storage.onChanged.addListener(listener)
    return () => {
      fetchSeq.current += 1
      chrome.storage.onChanged.removeListener(listener)
    }
  }, [])

  return { user, loading, error }
}
