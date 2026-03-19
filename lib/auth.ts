const TOKEN_KEY = "promptvault:token"
const USER_KEY = "promptvault:user"

export async function saveToken(token: string, user: { id: string; email: string }): Promise<void> {
  await chrome.storage.local.set({
    [TOKEN_KEY]: token,
    [USER_KEY]: user,
  })
}

export async function getToken(): Promise<string | null> {
  const result = await chrome.storage.local.get(TOKEN_KEY)
  return result[TOKEN_KEY] ?? null
}

export async function getUser(): Promise<{ id: string; email: string } | null> {
  const result = await chrome.storage.local.get(USER_KEY)
  return result[USER_KEY] ?? null
}

export async function clearAuth(): Promise<void> {
  await chrome.storage.local.remove([TOKEN_KEY, USER_KEY])
}

export async function isLoggedIn(): Promise<boolean> {
  const token = await getToken()
  return token !== null
}
