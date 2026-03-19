import Stripe from "stripe"
import { Router } from "express"
import type { Request, Response } from "express"
import { getPrisma } from "./db.js"
import { resolveUserId, AuthError } from "./config.js"
import { getEnv } from "./env.js"

let _stripe: Stripe | null = null
function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) throw new Error("STRIPE_SECRET_KEY is not set")
    _stripe = new Stripe(key)
  }
  return _stripe
}

const FREE_PROMPT_LIMIT = 50

const PRICES = {
  monthly: process.env.STRIPE_PRICE_MONTHLY ?? "",
  yearly: process.env.STRIPE_PRICE_YEARLY ?? "",
}

export const billingRouter = Router()

billingRouter.post("/api/billing/checkout", async (req: Request, res: Response) => {
  try {
    const userId = await resolveUserId(req)
    const prisma = getPrisma()
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } })

    const interval = req.body.interval === "yearly" ? "yearly" : "monthly"
    const priceId = PRICES[interval]
    if (!priceId) {
      return res.status(400).json({ error: "Price not configured" })
    }

    let customerId = user.stripeCustomerId
    if (!customerId) {
      const customer = await getStripe().customers.create({
        metadata: { userId: user.id },
      })
      customerId = customer.id
      await prisma.user.update({
        where: { id: userId },
        data: { stripeCustomerId: customerId },
      })
    }

    const baseUrl =
      req.headers.origin ?? getEnv().BASE_URL ?? "https://example.com"
    const session = await getStripe().checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/billing/cancel`,
    })

    return res.json({ url: session.url })
  } catch (err) {
    if (err instanceof AuthError) return res.status(401).json({ error: err.message })
    console.error("Checkout error:", err)
    return res.status(500).json({ error: "Failed to create checkout session" })
  }
})

billingRouter.post("/api/billing/portal", async (req: Request, res: Response) => {
  try {
    const userId = await resolveUserId(req)
    const prisma = getPrisma()
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } })

    if (!user.stripeCustomerId) {
      return res.status(400).json({ error: "No billing account found" })
    }

    const baseUrl =
      req.headers.origin ?? getEnv().BASE_URL ?? "https://example.com"
    const session = await getStripe().billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: baseUrl,
    })

    return res.json({ url: session.url })
  } catch (err) {
    if (err instanceof AuthError) return res.status(401).json({ error: err.message })
    return res.status(500).json({ error: "Failed to create portal session" })
  }
})

billingRouter.post("/api/webhooks/stripe", async (req: Request, res: Response) => {
  const sig = req.headers["stripe-signature"]
  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return res.status(400).json({ error: "Missing signature" })
  }

  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(
      JSON.stringify(req.body),
      sig,
      process.env.STRIPE_WEBHOOK_SECRET,
    )
  } catch {
    return res.status(400).json({ error: "Invalid signature" })
  }

  const prisma = getPrisma()

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session
      if (session.customer && session.subscription) {
        await prisma.user.updateMany({
          where: { stripeCustomerId: session.customer as string },
          data: { plan: "PRO" },
        })
      }
      break
    }

    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription
      const isActive = ["active", "trialing"].includes(sub.status)
      await prisma.user.updateMany({
        where: { stripeCustomerId: sub.customer as string },
        data: { plan: isActive ? "PRO" : "FREE" },
      })
      break
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription
      await prisma.user.updateMany({
        where: { stripeCustomerId: sub.customer as string },
        data: { plan: "FREE" },
      })
      break
    }
  }

  return res.json({ received: true })
})

export async function checkPromptLimit(userId: string): Promise<boolean> {
  const prisma = getPrisma()
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } })
  if (user.plan === "PRO") return true

  const count = await prisma.prompt.count({
    where: {
      space: { userId },
      deletedAt: null,
    },
  })
  return count < FREE_PROMPT_LIMIT
}

export { FREE_PROMPT_LIMIT }
