import type { PlasmoCSConfig } from "plasmo"

const isDevBuild = process.env.NODE_ENV !== "production"
const apiUrl = process.env.PLASMO_PUBLIC_API_URL

const baseHostPermissions = [
  "https://chat.openai.com/*",
  "https://chatgpt.com/*",
  "https://claude.ai/*",
  "https://v0.dev/*",
  "https://v0.app/*",
]

const hostPermissions = isDevBuild
  ? [...baseHostPermissions, "http://localhost:3000/*"]
  : apiUrl
    ? [...baseHostPermissions, `${apiUrl.replace(/\/+$/, "")}/*`]
    : baseHostPermissions

export const manifest: Partial<chrome.runtime.Manifest> = {
  permissions: ["storage", "scripting"],
  host_permissions: hostPermissions,
  content_security_policy: {
    extension_pages:
      "script-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none';"
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
            "https://v0.dev/*",
            "https://v0.app/*"
          ],
          resources: []
        }
      ]
}

export type { PlasmoCSConfig }
