import { Component, type ReactNode } from "react"
import { ClerkLoaded, ClerkLoading, ClerkProvider } from "@clerk/chrome-extension"
import { App } from "~components/App"
import "~style.css"

const PUBLISHABLE_KEY = process.env.PLASMO_PUBLIC_CLERK_PUBLISHABLE_KEY

if (!PUBLISHABLE_KEY) {
  throw new Error(
    "Missing PLASMO_PUBLIC_CLERK_PUBLISHABLE_KEY. Add it to .env (see .env.example)."
  )
}

class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error?: Error }
> {
  state = { hasError: false, error: undefined as Error | undefined }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            width: 400,
            height: 600,
            padding: 16,
            background: "#f6f2ea",
            color: "#20160b",
            fontSize: 12,
            overflow: "auto",
          }}>
          <h2 style={{ margin: "0 0 8px 0", fontSize: 14 }}>Something went wrong</h2>
          <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
            {this.state.error?.message ?? "Unknown error"}
          </pre>
        </div>
      )
    }
    return this.props.children
  }
}

function IndexPopup() {
  return (
    <ErrorBoundary>
      <ClerkProvider
        publishableKey={PUBLISHABLE_KEY}
        routerPush={(to) => chrome.tabs.update({ url: to })}
        routerReplace={(to) => chrome.tabs.update({ url: to })}
        afterSignOutUrl={chrome.runtime.getURL("popup.html")}
        signInFallbackRedirectUrl={chrome.runtime.getURL("popup.html")}
        signUpFallbackRedirectUrl={chrome.runtime.getURL("popup.html")}>
        <ClerkLoading>
          <div
            style={{
              width: 400,
              height: 600,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#f6f2ea",
              color: "#74624a",
              fontSize: 14,
            }}>
            Loading…
          </div>
        </ClerkLoading>
        <ClerkLoaded>
          <App />
        </ClerkLoaded>
      </ClerkProvider>
    </ErrorBoundary>
  )
}

export default IndexPopup
