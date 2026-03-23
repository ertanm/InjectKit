# Railway Deployment Guide

## 1. Set Root Directory (if using monorepo)

If your repo structure is:
```
repo-root/
  promptextension/   ← Dockerfile, server, prisma live here
    Dockerfile
    server/
    prisma/
```

In Railway: **Service Settings → General → Root Directory** = `promptextension`

This ensures Railway builds from the correct folder and finds the Dockerfile.

The Docker image includes `docs/` so the API can render `GET /privacy` and `GET /terms` from `docs/privacy-policy.md` and `docs/terms-of-service.md`. After deploy, use `https://YOUR_PUBLIC_HOST/privacy` as the Chrome Web Store privacy policy URL. Stripe webhook endpoint: `POST https://YOUR_PUBLIC_HOST/api/webhooks/stripe` (set `STRIPE_WEBHOOK_SECRET` in Stripe and Railway).

## 2. Add PostgreSQL and DATABASE_URL

1. In your Railway project: **+ New** → **Database** → **PostgreSQL**
2. Open your **API service** (the Node app)
3. **Variables** → **+ New Variable** → **Add Reference**
4. Select your **PostgreSQL** service → choose **DATABASE_URL**
5. Save (triggers redeploy)

## 3. Required Variables

| Variable | How to set |
|----------|------------|
| DATABASE_URL | Add Reference from Postgres service |
| JWT_SECRET | 64-char random string (e.g. `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`) |
| NODE_ENV | `production` |
| BASE_URL | Public HTTPS origin of this service (e.g. `https://YOUR_SERVICE.up.railway.app`) — required for Stripe Checkout and billing portal return URLs |
| CORS_ORIGINS | Non-empty (e.g. your marketing site). The API always allows `chrome-extension://` origins for the extension. |
| SENTRY_DSN, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_MONTHLY, STRIPE_PRICE_YEARLY | Optional; set when using Sentry and Stripe |

## 4. Trigger Redeploy

- **Commit**: Push to your connected branch. Railway auto-deploys on push.
- **Manual**: In Railway dashboard → **Deployments** → **Deploy** (or **Redeploy**)
- **Variables**: Changing variables triggers a redeploy automatically

## 5. If Deploys Don't Trigger on Push

- Check **Service Settings** → **Source** (GitHub repo connected?)
- Check **Build** → **Branch** (correct branch?)
- Try **Deployments** → **Redeploy** to force a new build
