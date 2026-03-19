import type { PlasmoCSConfig } from "plasmo"

const isDevBuild = process.env.NODE_ENV !== "production"
const apiUrl = process.env.PLASMO_PUBLIC_API_URL

const clerkHosts = [
  "https://accounts.clerk.dev/*",
  "https://*.clerk.accounts.dev/*",
]

const baseHostPermissions = [
  "https://chat.openai.com/*",
  "https://chatgpt.com/*",
  "https://claude.ai/*",
  "https://v0.dev/*",
  ...clerkHosts,
]

const hostPermissions = isDevBuild
  ? [...baseHostPermissions, "http://localhost:3000/*"]
  : apiUrl
    ? [...baseHostPermissions, `${apiUrl.replace(/\/+$/, "")}/*`]
    : baseHostPermissions

export const manifest: Partial<chrome.runtime.Manifest> = {
  permissions: ["cookies", "storage"],
  host_permissions: hostPermissions,
  content_security_policy: {
    extension_pages:
      "script-src 'self'; object-src 'none'; base-uri 'self'; frame-src https://*.clerk.accounts.dev https://accounts.clerk.dev; frame-ancestors 'none';"
  },
  // Note: Plasmo injects HMR web_accessible_resources in dev builds.
  // Verify that build/chrome-mv3-prod/manifest.json does NOT contain
  // <all_urls> in web_accessible_resources before publishing.
  web_accessible_resources: isDevBuild
    ? undefined // let Plasmo handle dev HMR
    : [
        {
          matches: [
            "https://chat.openai.com/*",
            "https://chatgpt.com/*",
            "https://claude.ai/*",
            "https://v0.dev/*"
          ],
          resources: []
        }
      ]
}

export type { PlasmoCSConfig }
