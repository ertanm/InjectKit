# PromptVault Privacy Policy

**Last updated:** March 21, 2026

## 1. Introduction

PromptVault ("we", "us", "our") is a browser extension and cloud service that helps users save, organize, and inject AI prompts. This Privacy Policy explains how we collect, use, and protect your data.

## 2. Data We Collect

### Account Data
- Email address and password hash (stored securely, never plaintext)
- JWT tokens for session management (stored in extension local storage)

### User Content
- Prompt titles, bodies, and tags you create
- Prompt spaces (folders) you organize
- Version history of prompt edits (Pro users)

### Usage Data
- For **Pro** accounts, optional usage analytics stored by us: prompt injection frequency and target site (see [Analytics](#analytics) below)
- Error reports (via Sentry, see below)

### Billing Data
- Subscription status (Free/Pro)
- Stripe customer ID (we do not store card numbers)

### Analytics

We do **not** use third-party product-analytics SDKs (such as PostHog or Google Analytics) in the extension. Pro usage statistics may be recorded on our own servers when you use features that rely on that data.

## 3. Data We Do NOT Collect

- We do not read or store the content of AI conversations
- We do not track browsing history beyond supported AI chat sites
- We do not use tracking cookies for advertising
- We do not sell or share personal data with third parties for advertising

## 4. How We Use Your Data

- To provide the PromptVault service (storing and syncing your prompts)
- To authenticate your account
- To process payments (via Stripe)
- To improve reliability (error monitoring via Sentry, aggregated)
- To send transactional emails (account-related only)

## 5. Data Storage and Security

- Data is hosted on **Railway**; configure your deployment region to meet your residency needs (e.g. EU for GDPR)
- Data is encrypted in transit (TLS) and at rest where supported by the infrastructure
- We use bcrypt for password hashing and JWT for session tokens
- We use Stripe for payments (PCI DSS Level 1 certified)

## 6. Your Rights (GDPR)

Under the General Data Protection Regulation, you have the right to:

- **Access** your personal data
- **Rectify** inaccurate data
- **Erase** your data ("right to be forgotten")
- **Export** your data in a machine-readable format
- **Restrict** processing of your data
- **Object** to processing of your data

To exercise these rights, contact us at privacy@promptvault.dev.

## 7. Data Retention

- Account data is retained while your account is active
- Prompt data is retained until you delete it or close your account
- Deleted prompts are soft-deleted and permanently purged after 30 days
- Aggregated or operational metrics may be retained as needed for the service

## 8. Third-Party Services

| Service | Purpose | Data Shared |
|---------|---------|-------------|
| PromptVault (self-hosted API) | Authentication, prompts, optional Pro analytics | Email, password hash, JWT tokens, user content |
| Stripe | Payments | Customer ID, subscription status |
| Sentry | Error tracking | Technical error reports (may include anonymized context) |
| Railway | Hosting | Data processed by the service |

## 9. Changes to This Policy

We may update this Privacy Policy from time to time. We will notify users of significant changes via email or in-app notification.

## 10. Contact

For privacy-related inquiries: privacy@promptvault.dev
