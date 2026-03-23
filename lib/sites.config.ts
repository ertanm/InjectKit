export interface SiteConfig {
  name: string
  hostPatterns: string[]
  inputSelector: string
  inputType: "textarea" | "contenteditable" | "prosemirror"
  fallbackSelectors?: string[]
}

export const siteConfigs: SiteConfig[] = [
  {
    name: "ChatGPT",
    hostPatterns: ["chat.openai.com", "chatgpt.com"],
    // ChatGPT switched from textarea to contenteditable div; try both
    inputSelector: 'div[contenteditable="true"][id="prompt-textarea"]',
    inputType: "contenteditable",
    fallbackSelectors: [
      'div[contenteditable="true"][data-virtualkeyboard="true"]',
      'div[contenteditable="true"].ProseMirror',
      "textarea#prompt-textarea",
      "#prompt-textarea",
      'textarea[data-id="root"]',
    ],
  },
  {
    name: "Claude",
    hostPatterns: ["claude.ai"],
    inputSelector: 'div[contenteditable="true"].ProseMirror',
    inputType: "prosemirror",
    fallbackSelectors: [
      'div[contenteditable="true"]',
      'fieldset div[contenteditable="true"]',
    ],
  },
  {
    name: "v0",
    hostPatterns: ["v0.dev", "www.v0.dev", "v0.app", "www.v0.app"],
    // v0 chat uses contenteditable/ProseMirror (similar to Claude); fallback to textarea
    inputSelector: 'div[contenteditable="true"].ProseMirror',
    inputType: "prosemirror",
    fallbackSelectors: [
      'div[contenteditable="true"]',
      '[role="textbox"]',
      'textarea[placeholder]',
      'textarea',
      'form textarea',
    ],
  },
]

function hostMatches(hostname: string, pattern: string): boolean {
  return hostname === pattern || hostname.endsWith(`.${pattern}`)
}

export function findSiteConfig(hostname: string): SiteConfig | null {
  return (
    siteConfigs.find((site) =>
      site.hostPatterns.some((pattern) => hostMatches(hostname, pattern)),
    ) ?? null
  )
}
