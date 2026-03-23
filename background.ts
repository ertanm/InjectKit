export {}

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

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id) {
    sendResponse?.({ ok: false, error: "unauthorized_sender" })
    return
  }

  if (!isInjectPromptMessage(message)) {
    sendResponse?.({ ok: false, error: "invalid_message" })
    return
  }

  // Popup steals focus so lastFocusedWindow has no tabs; query by URL instead
  const urlPatterns = [
    "https://chat.openai.com/*",
    "https://chatgpt.com/*",
    "https://claude.ai/*",
    "https://v0.dev/*",
    "https://v0.app/*",
  ]
  // Respond immediately to avoid "message port closed" when popup closes
  chrome.tabs.query({ url: urlPatterns }, (tabs) => {
    const tab = tabs.find((t) => t.active) ?? tabs[0]
    const tabId = tab?.id
    if (!tabId) {
      sendResponse?.({ ok: false, error: "no_tab", details: "Open ChatGPT, Claude, or v0 in a tab first" })
      return
    }
    sendResponse?.({ ok: true })

    let didInject = false
    function trySend() {
      chrome.tabs.sendMessage(tabId, message, () => {
        if (chrome.runtime.lastError) {
          const msg = String(chrome.runtime.lastError?.message ?? "")
          if (!didInject && (msg.includes("Receiving end does not exist") || msg.includes("receiving end"))) {
            didInject = true
            injectAndRetry()
          }
        }
      })
    }

    function injectAndRetry() {
      const manifest = chrome.runtime.getManifest()
      const cs = manifest.content_scripts?.[0]
      const files = cs?.js as string[] | undefined
      if (files?.length) {
        chrome.scripting.executeScript({ target: { tabId }, files }, () => {
          if (!chrome.runtime.lastError) {
            setTimeout(trySend, 50)
          }
        })
      }
    }

    trySend()
  })
  return true
})

chrome.commands?.onCommand?.addListener((command) => {
  if (command === "open-promptvault") {
    chrome.action.openPopup()
  }
})
