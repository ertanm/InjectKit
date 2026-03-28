# Getting Started with InjectKit

## Prerequisites

- **Node.js** v20+
- **Docker** and **Docker Compose** (for PostgreSQL and Redis)
- **npm** (comes with Node.js)

---

## 1. Start the Database

From the `promptextension/` directory:

```bash
docker compose up -d db redis
```

This starts PostgreSQL 15 on `localhost:5432` and Redis 7 on `localhost:6379`.

Verify they're running:

```bash
docker compose ps
```

---

## 2. Configure Environment Variables

Copy the example and fill in your values:

```bash
cp .env.example .env
```

For **local development without Stripe**, the defaults work out of the box:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/injectkit?schema=public
PORT=3000
NODE_ENV=development
JWT_SECRET=dev-secret-min-32-chars-for-local-development
```

With `ALLOW_DEV_AUTO_AUTH=true`, the server accepts requests without a token on localhost and uses a dev user. Otherwise, register via the extension and sign in with email/password.

To enable **Stripe billing** (optional):
1. Get test keys from https://dashboard.stripe.com/test/apikeys
2. Add to `.env`:
   ```env
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

---

## 3. Set Up the Server

```bash
cd server
npm install
```

Run database migrations:

```bash
cd ..
npx prisma migrate deploy
npx prisma generate
```

Seed the database with sample data (run from `promptextension/` root, not `server/`):

```bash
npx tsx prisma/seed.ts
```

Start the API server:

```bash
cd server
npm run dev
```

The API is now running at **http://localhost:3000** for local development. Verify:

```bash
curl http://localhost:3000/health
# {"ok":true,"db":"connected"}
```

---

In production, configure `PLASMO_PUBLIC_API_URL` to an **HTTPS** URL (for example, `https://api.injectkit.dev`) so the extension never sends tokens or prompt data over plain HTTP.

---

## 4. Try the API

Create a space:

```bash
curl -X POST http://localhost:3000/api/spaces \
  -H "Content-Type: application/json" \
  -d '{"name": "My Prompts"}'
```

List your spaces:

```bash
curl http://localhost:3000/api/spaces
```

Create a prompt (replace `SPACE_ID` with the id from above):

```bash
curl -X POST http://localhost:3000/api/prompts \
  -H "Content-Type: application/json" \
  -d '{"title": "Code Review", "body": "Review this code for bugs and improvements", "spaceId": "SPACE_ID", "tags": ["review"]}'
```

List prompts in a space:

```bash
curl http://localhost:3000/api/spaces/SPACE_ID/prompts
```

Update a prompt:

```bash
curl -X PATCH http://localhost:3000/api/prompts/PROMPT_ID \
  -H "Content-Type: application/json" \
  -d '{"title": "Updated Title"}'
```

Delete a prompt (soft delete):

```bash
curl -X DELETE http://localhost:3000/api/prompts/PROMPT_ID
```

---

## 5. Build and Load the Extension

From the `promptextension/` directory (not `server/`):

```bash
npm install
npm run build
```

This creates a production build in `build/chrome-mv3-prod/`.

### Load in Chrome:

1. Open `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select the `promptextension/build/chrome-mv3-prod/` folder
5. The InjectKit icon appears in your toolbar

### Load in Firefox (optional):

```bash
npm run build:firefox
```

1. Open `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on**
3. Select any file inside `build/firefox-mv2-prod/`

---

## 6. Use the Extension

1. **Click the InjectKit icon** in your toolbar to open the popup
2. Complete the **3-step onboarding tour**
3. Select a space from the dropdown
4. Browse your prompts, use the search bar to filter
5. **Click the copy icon** on any prompt to copy to clipboard
6. **Click the inject arrow** to send a prompt to the active AI chat
7. Use **arrow keys** to navigate, **Enter** to inject

### Keyboard Shortcut

Press **Cmd+K** (Mac) or **Ctrl+K** (Windows/Linux) on a supported site to open InjectKit.

### Supported Inject Sites

- ChatGPT (chat.openai.com / chatgpt.com)
- Claude (claude.ai)
- v0 by Vercel (v0.dev)

---

## 7. Run Tests

```bash
cd server
npm test
```

This runs 25 integration tests covering all CRUD routes (spaces, prompts, pagination, soft delete, validation, 409 conflicts).

Watch mode:

```bash
npm run test:watch
```

---

## 8. Development Workflow

**API server** (auto-reloads on save):

```bash
cd server
npm run dev
```

**Extension** (auto-reloads on save):

```bash
npm run dev
```

Plasmo will open a new Chrome window with the extension loaded. Changes to popup, content scripts, and background scripts hot-reload automatically.

---

## Project Structure

```
promptextension/
├── prisma/
│   ├── schema.prisma        # Database schema (7 models)
│   ├── seed.ts               # Sample data seeder
│   └── migrations/           # 5 SQL migrations
├── server/
│   ├── index.ts              # Server entry point
│   ├── app.ts                # Express app (all routes)
│   ├── db.ts                 # Prisma client init
│   ├── config.ts             # Auth resolver (JWT / dev user)
│   ├── schemas.ts            # Zod validation schemas
│   ├── billing.ts            # Stripe checkout, webhooks, plan enforcement
│   ├── versions.ts           # Version history API (Pro)
│   ├── teams.ts              # Team invites, members, roles
│   ├── analytics.ts          # Usage event logging + top prompts
│   ├── import-export.ts      # CSV/JSON import and export
│   ├── sentry.ts             # Error tracking init
│   └── __tests__/            # Integration tests
├── components/
│   ├── SearchBar.tsx          # Client-side prompt search
│   ├── TabNav.tsx             # Tag-based tab navigation
│   ├── PromptCard.tsx         # Individual prompt with copy/inject
│   ├── SpaceSelector.tsx      # Space dropdown
│   ├── LoadingSkeleton.tsx    # Shimmer loading state
│   ├── EmptyState.tsx         # No-prompts placeholder
│   └── OnboardingTour.tsx     # 3-step first-run tour
├── contents/
│   └── inject.ts             # Content script for AI sites
├── lib/
│   ├── api.ts                # API client (fetch + auth headers)
│   ├── inject.ts             # DOM text injection logic
│   ├── sites.config.ts       # Per-site CSS selector config
│   ├── storage.ts            # chrome.storage.local cache layer
│   └── sync.ts               # Sync-on-open + offline fallback
├── popup.tsx                  # Main popup UI
├── background.ts             # Message forwarding + shortcut handler
├── style.css                  # Tailwind + glassmorphism utilities
├── tailwind.config.js         # Tailwind theme (fonts, glass colors)
├── docker-compose.yml         # PostgreSQL + Redis + API
├── Dockerfile                 # Server container image
└── docs/
    ├── GETTING_STARTED.md     # This file
    ├── compat.md              # Browser compatibility matrix
    ├── privacy-policy.md      # GDPR-compliant privacy policy
    ├── terms-of-service.md    # Terms of service
    ├── store-listing.md       # Chrome Web Store copy
    └── launch-checklist.md    # Launch day runbook
```
