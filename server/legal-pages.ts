import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { markdownToHtml, wrapLegalPage } from "./markdown-html.js"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Resolve docs directory: works from server/ (dev) and server/dist/ (compiled) and Docker (/app/server/dist → /app/docs).
 */
function getDocsDir(): string {
  const candidates = [
    path.join(__dirname, "..", "..", "docs"),
    path.join(__dirname, "..", "docs"),
    path.join(process.cwd(), "..", "docs"),
    path.join(process.cwd(), "docs"),
  ]
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, "privacy-policy.md"))) {
      return dir
    }
  }
  return path.join(__dirname, "..", "..", "docs")
}

export function renderPrivacyHtml(): string {
  const md = fs.readFileSync(path.join(getDocsDir(), "privacy-policy.md"), "utf8")
  return wrapLegalPage("Privacy Policy", markdownToHtml(md))
}

export function renderTermsHtml(): string {
  const md = fs.readFileSync(path.join(getDocsDir(), "terms-of-service.md"), "utf8")
  return wrapLegalPage("Terms of Service", markdownToHtml(md))
}

export function renderBillingSuccessHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Subscription updated — PromptVault</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 28rem; margin: 4rem auto; padding: 0 1rem; text-align: center; }
  </style>
</head>
<body>
  <h1>Thank you</h1>
  <p>Your subscription was updated. You can close this tab and return to PromptVault.</p>
</body>
</html>`
}

export function renderBillingCancelHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Checkout canceled — PromptVault</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 28rem; margin: 4rem auto; padding: 0 1rem; text-align: center; }
  </style>
</head>
<body>
  <h1>Checkout canceled</h1>
  <p>No charges were made. You can try again anytime from PromptVault.</p>
</body>
</html>`
}
