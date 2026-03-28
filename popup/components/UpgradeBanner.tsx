import { useState } from "react"
import "~style.css"

type UpgradeBannerProps = {
  feature: string
}

export function UpgradeBanner({ feature }: UpgradeBannerProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleUpgrade = async () => {
    const base = process.env.PLASMO_PUBLIC_API_URL
    if (typeof base !== "string" || base.length === 0) return
    const normalized = base.replace(/\/$/, "")

    try {
      setLoading(true)
      setError(null)
      const result = await chrome.storage.local.get("token")
      const token = result.token
      if (typeof token !== "string") return

      const res = await fetch(`${normalized}/api/billing/checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ interval: "monthly" }),
        signal: AbortSignal.timeout(10_000),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError((body as { error?: string }).error ?? "Failed to start checkout")
        return
      }

      const data = (await res.json()) as { url?: string }
      if (data.url) {
        chrome.tabs.create({ url: data.url })
      }
    } catch {
      setError("Network error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-xl border border-[#F59E0B]/20 bg-[#F59E0B]/5 p-4">
      <h2 className="text-sm font-semibold text-[var(--pv-text)]">Upgrade to Pro</h2>
      <p className="mt-1 text-xs text-[var(--pv-text-muted)]">
        Unlock {feature} and all Pro features.
      </p>
      {error && (
        <p className="mt-1 text-xs text-red-400">{error}</p>
      )}
      <div className="shimmer-button mt-3 w-full rounded-lg">
        <button
          type="button"
          disabled={loading}
          onClick={() => void handleUpgrade()}
          className="pv-button-primary pv-focus relative z-[1] w-full rounded-lg py-2 text-sm font-semibold text-[var(--pv-primary-foreground)] disabled:opacity-50">
          {loading ? "Loading…" : "Upgrade"}
        </button>
      </div>
    </div>
  )
}
