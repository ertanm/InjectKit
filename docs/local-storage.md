## Local Storage in InjectKit

InjectKit stores some data in your browser's `chrome.storage.local` area to improve performance and provide offline-friendly behavior.

### What we store locally

- A cached copy of your **spaces** (names and IDs)
- A timestamp of the **last successful sync**

All of this data is stored **in plaintext** under keys namespaced with the `injectkit:` prefix (for example, `injectkit:spaces`).

### Security and privacy considerations

- Data in `chrome.storage.local` is **not encrypted by default** and can be read by other extensions with the appropriate permissions or by anyone with local access to your browser profile.
- InjectKit does **not** store your AI chat transcripts, and it no longer caches full prompt bodies in `chrome.storage.local`—prompt text stays on the server and in the pages where you use it.
- If you use InjectKit to store highly sensitive prompts (e.g., containing secrets or regulated data), we recommend:
  - Keeping your browser profile protected (OS account password, full-disk encryption).
  - Avoiding storage of raw secrets in prompts where possible.

Future versions may introduce optional client-side encryption for users with higher confidentiality requirements.

