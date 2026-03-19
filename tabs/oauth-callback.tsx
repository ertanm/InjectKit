import { AuthenticateWithRedirectCallback, ClerkProvider } from "@clerk/chrome-extension"

const PUBLISHABLE_KEY = process.env.PLASMO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? ""

function OAuthCallback() {
  return (
    <ClerkProvider
      publishableKey={PUBLISHABLE_KEY}
      signInFallbackRedirectUrl={chrome.runtime.getURL("popup.html")}
      signUpFallbackRedirectUrl={chrome.runtime.getURL("popup.html")}>
      <AuthenticateWithRedirectCallback />
    </ClerkProvider>
  )
}

export default OAuthCallback
