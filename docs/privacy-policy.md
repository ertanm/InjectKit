# PromptVault Privacy Policy

**Last updated:** March 15, 2026

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
- Prompt injection frequency and target sites (Pro analytics, opt-in)
- Error reports (via Sentry, anonymized)
- Feature usage events (via Posthog, anonymized)

### Billing Data
- Subscription status (Free/Pro)
- Stripe customer ID (we do not store card numbers)

## 3. Data We Do NOT Collect

- We do not read or store the content of AI conversations
- We do not track browsing history beyond supported AI chat sites
- We do not use tracking cookies
- We do not sell or share personal data with third parties for advertising

## 4. How We Use Your Data

- To provide the PromptVault service (storing and syncing your prompts)
- To authenticate your account
- To process payments (via Stripe)
- To improve the product (anonymized analytics)
- To send transactional emails (account-related only)

## 5. Data Storage and Security

- All data is stored on servers in the **European Union** (Railway EU region)
- Data is encrypted in transit (TLS 1.3) and at rest
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
- Anonymized analytics data may be retained indefinitely

## 8. Third-Party Services

| Service | Purpose | Data Shared |
|---------|---------|-------------|
| (Self-hosted) | Authentication | Email, password hash, JWT tokens |
| Stripe | Payments | Customer ID, subscription status |
| Sentry | Error tracking | Anonymized error reports |
| Posthog | Product analytics | Anonymized usage events |
| Railway | Hosting | All data (EU servers) |

## 9. Changes to This Policy

We may update this Privacy Policy from time to time. We will notify users of significant changes via email or in-app notification.

## 10. Contact

For privacy-related inquiries: privacy@promptvault.dev
