This is a [Plasmo extension](https://docs.plasmo.com/) project bootstrapped with [`plasmo init`](https://www.npmjs.com/package/plasmo).

## Getting Started

First, run the development server:

```bash
pnpm dev
# or
npm run dev
```

Open your browser and load the appropriate development build. For example, if you are developing for the chrome browser, using manifest v3, use: `build/chrome-mv3-dev`.

You can start editing the popup by modifying `popup.tsx`. It should auto-update as you make changes. To add an options page, simply add a `options.tsx` file to the root of the project, with a react component default exported. Likewise to add a content page, add a `content.ts` file to the root of the project, importing some module and do some logic, then reload the extension on your browser.

For further guidance, [visit our Documentation](https://docs.plasmo.com/)

## Making production build (extension)

**Required:** Set `PLASMO_PUBLIC_API_URL` to your production HTTPS API before building:

```bash
export PLASMO_PUBLIC_API_URL=https://api.promptvault.com  # your API URL
pnpm build:prod
# or
PLASMO_PUBLIC_API_URL=https://api.promptvault.com npm run build:prod
```

Or add to `.env.production`:
```
PLASMO_PUBLIC_API_URL=https://api.promptvault.com
```

Then run `pnpm build` (Plasmo loads `.env.production` when `NODE_ENV=production`).

This creates a production bundle ready for the Chrome Web Store. **Do not use `pnpm build` without setting the API URL** — the extension would default to `http://localhost:3000` and fail for users.

Before publishing, run:

```bash
pnpm verify:prod-manifest
```

This verifies: no localhost in manifest or bundle, strict CSP, no dev-only permissions.

## Privacy policy and terms (Chrome Web Store)

The API serves public HTML on the same host (`server/legal-pages.ts`):

- `GET /privacy` — from `docs/privacy-policy.md`
- `GET /terms` — from `docs/terms-of-service.md`
- `GET /billing/success` and `GET /billing/cancel` — Stripe Checkout return pages

Use `https://YOUR_API_HOST/privacy` as the **Privacy policy URL** in the Chrome Developer Dashboard.

## Stripe and Sentry (production)

- **`BASE_URL`** — Public HTTPS origin of this API (e.g. your Railway URL) so Stripe Checkout success/cancel and billing portal `return_url` resolve correctly.
- **Stripe webhook** — `POST https://YOUR_API_HOST/api/webhooks/stripe`; set **`STRIPE_WEBHOOK_SECRET`**. Configure **`STRIPE_PRICE_MONTHLY`** and **`STRIPE_PRICE_YEARLY`** (Stripe Price IDs).
- **`SENTRY_DSN`** — Optional; enables server error reporting (`server/sentry.ts`).

## Submit to the web stores

Workflow: [`.github/workflows/submit.yml`](.github/workflows/submit.yml). Set repository secrets **`PLASMO_PUBLIC_API_URL`** (same HTTPS URL as production API) and **`SUBMIT_KEYS`**. Upload the first build to the Chrome Web Store manually once, then use [Plasmo submit / bpp](https://docs.plasmo.com/framework/workflows/submit).

## Running the API in production

The `server` directory contains the API used by the extension. A typical production deployment looks like:

1. Build and publish the Docker image defined in `promptextension/Dockerfile`.
2. Run database migrations with Prisma:

   ```bash
   cd server
   pnpm db:generate
   pnpm prisma migrate deploy --schema=../prisma/schema.prisma
   ```

3. Start the container with the required environment variables:

   - `DATABASE_URL` – Postgres connection string (required).
   - `JWT_SECRET` – 64-char random string for signing JWTs (required in production).
   - `CORS_ORIGINS` – comma-separated list of allowed origins. **In production this must not be empty.**
   - `BASE_URL` – Public HTTPS origin of the API (for Stripe success/cancel and billing portal URLs).
   - `NODE_ENV=production`
   - Optional: `SENTRY_DSN`, `REDIS_URL`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_YEARLY`.

CI runs server tests and a production extension build in [`.github/workflows/ci.yml`](.github/workflows/ci.yml).

The server performs startup validation of critical env vars and will refuse to start if:

- Required variables are missing or malformed.
- `NODE_ENV=production` but `CORS_ORIGINS` is empty.

You can health-check the API using:

```bash
curl -f https://your-api/health
```
