# PromptVault Launch Checklist

## Pre-Launch (Sprint 9)

- [ ] Chrome Web Store listing submitted and approved
- [ ] Firefox Add-ons listing submitted
- [ ] Landing page live at domain
- [ ] CORS_ORIGINS set for production API (required non-empty; the API also allows all `chrome-extension://` origins for the extension)
- [ ] Stripe checkout working in production
- [ ] Demo video recorded (<90s)
- [ ] ProductHunt listing drafted
- [ ] All launch copy pre-written
- [ ] Hotfix branch strategy documented

## Launch Day (Sprint 10)

### Morning
- [ ] Verify production API health (`/health` endpoint)
- [ ] Verify Sentry is receiving events (test error)
- [ ] Verify Stripe webhooks are working (test event)
- [ ] Verify extension installs cleanly from Chrome Web Store

### Launch Posts
- [ ] ProductHunt: Publish (schedule Tue-Thu, 12:01 AM PST)
- [ ] Hacker News: Submit Show HN post
- [ ] Twitter/X: Publish developer thread
- [ ] Cursor Discord: Share in #show-and-tell
- [ ] Claude Discord: Share in relevant channel

### Monitoring (All Week)
- [ ] Sentry dashboard: Check for P0 errors every 2 hours
- [ ] Stripe dashboard: Monitor conversion rate
- [ ] Product funnel metrics: optional (first-party Pro usage in API; no third-party analytics SDK required for launch)
- [ ] Railway metrics: API latency, CPU, memory

### Targets
- [ ] 500+ installs by end of week
- [ ] 25+ Pro signups by end of sprint
- [ ] Zero P0 production incidents lasting >30 min

## Hotfix Strategy

```
main (production)
  └── hotfix/issue-xxx (branch from main)
       └── Fix → PR → review → merge to main → deploy
```

Rules:
- No feature development during launch week
- All hotfixes go directly to main via PR
- Deploy immediately after merge (auto-deploy via Railway)
- Test fix in staging equivalent before merge if possible
