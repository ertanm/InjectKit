# Chrome Web Store screenshots

Use a **production** extension build (`npm run build:prod` with `PLASMO_PUBLIC_API_URL` set) and capture at **1280×800** (Chrome DevTools device toolbar or window size).

## Recommended set (5)

1. **Hero / library** — Popup open showing spaces, search, and prompt list (signed in).
2. **Auth** — Sign-in or sign-up screen (blur or use a demo account email).
3. **Prompt detail / edit** — Create or edit prompt modal with tags.
4. **On a supported site** — Browser window with ChatGPT, Claude, or v0 visible; extension icon visible in toolbar (optional: show inject flow).
5. **Empty state or onboarding** — First-run experience if you use it.

## Tips

- Use a neutral wallpaper or default browser theme so the UI stays readable.
- Do not include real passwords, API keys, or private prompts.
- Match what new users see after install (same API URL as production).

## Promotional tiles (optional)

- **Small:** 440×280 — Product name + one-line value prop + key UI crop.
- **Large:** 920×680 — Same, with more context (supported sites or shortcut hint).

See [store-listing.md](./store-listing.md) for copy to echo in images.
