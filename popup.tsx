import { useEffect, useState } from "react"
import { App } from "~components/App"
import { AuthScreen } from "~components/AuthScreen"
import { isLoggedIn } from "~lib/auth"
import "~style.css"

function IndexPopup() {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null)

  useEffect(() => {
    isLoggedIn().then(setLoggedIn)
  }, [])

  if (loggedIn === null) {
    return (
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
    )
  }

  if (!loggedIn) {
    return <AuthScreen onSuccess={() => setLoggedIn(true)} />
  }

  return <App onSignOut={() => setLoggedIn(false)} />
}

export default IndexPopup
