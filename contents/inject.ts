import type { PlasmoCSConfig } from "plasmo"
import { findSiteConfig } from "~lib/sites.config"
import { findInputElement, injectText } from "~lib/inject"

export const config: PlasmoCSConfig = {
  matches: [
    "https://chat.openai.com/*",
    "https://chatgpt.com/*",
    "https://claude.ai/*",
    "https://v0.dev/*",
    "https://v0.app/*",
  ],
  run_at: "document_idle",
}

const siteConfig = findSiteConfig(window.location.hostname)

type InjectPromptMessage = {
  type: "INJECT_PROMPT"
  body: string
}

function isInjectPromptMessage(message: unknown): message is InjectPromptMessage {
  return (
    typeof message === "object" &&
    message !== null &&
    (message as { type?: unknown }).type === "INJECT_PROMPT" &&
    typeof (message as { body?: unknown }).body === "string" &&
    (message as { body: string }).body.length > 0 &&
    (message as { body: string }).body.length <= 10000
  )
}

let observer: MutationObserver | null = null

function setupObserver() {
  if (observer || !siteConfig) return

  observer = new MutationObserver(() => {
    const input = findInputElement(siteConfig)
    if (input) {
      input.dataset.promptvaultReady = "true"
    }
  })

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  })
}

function handleInjectMessage(message: unknown, sender: chrome.runtime.MessageSender) {
  if (sender.id !== chrome.runtime.id) {
    return
  }

  if (!siteConfig || !isInjectPromptMessage(message)) return

  const input = findInputElement(siteConfig)
  if (!input) {
    console.warn("[PromptVault] Could not find input element on", siteConfig.name)
    return
  }

  injectText(input, message.body, siteConfig.inputType)
}

if (siteConfig) {
  chrome.runtime.onMessage.addListener(handleInjectMessage)
  setupObserver()
}
