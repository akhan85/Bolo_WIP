"use server";

import { auth, currentUser } from "@clerk/nextjs";
import { headers } from "next/headers";
import Stripe from "stripe";

import { GIFTED_SUBSCRIPTION_PREFIX } from "@/constants";
import { getUserSubscription } from "@/db/queries";
import { stripe } from "@/lib/stripe";

const hasStripeKey = () =>
  !!(process.env.STRIPE_API_SECRET_KEY || process.env.STRIPE_API_KEY);

// Prefer the incoming request host so checkout works on localhost, LAN, and
// Vercel even when NEXT_PUBLIC_APP_URL was missing at build time.
const shopReturnUrl = () => {
  const h = headers();
  const host = h.get("x-forwarded-host") || h.get("host");
  const forwardedProto = h.get("x-forwarded-proto")?.split(",")[0]?.trim();

  if (host) {
    const isLocal =
      host.startsWith("localhost") || host.startsWith("127.0.0.1");
    const proto = forwardedProto || (isLocal ? "http" : "https");
    return `${proto}://${host}/shop`;
  }

  const envUrl = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (envUrl && /^https?:\/\//i.test(envUrl)) return `${envUrl}/shop`;

  if (process.env.VERCEL_PROJECT_PRODUCTION_URL)
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}/shop`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}/shop`;

  return "http://localhost:3000/shop";
};

const stripeMessage = (error: unknown) => {
  const message =
    error instanceof Stripe.errors.StripeError
      ? error.message
      : error instanceof Error
        ? error.message
        : "";

  if (/did not provide an API key|Invalid API Key/i.test(message))
    return "Stripe API key is missing or invalid. Add STRIPE_API_SECRET_KEY to the environment.";
  if (/Invalid URL|explicit scheme|success_url|cancel_url/i.test(message))
    return "Checkout return URL is invalid. Set NEXT_PUBLIC_APP_URL to this site's URL.";

  return message || "Something went wrong.";
};

export const createStripeUrl = async () => {
  try {
    if (!hasStripeKey())
      return {
        error:
          "Stripe API key is missing or invalid. Add STRIPE_API_SECRET_KEY to the environment.",
      };

    const { userId } = auth();
    const user = await currentUser();

    if (!userId || !user) return { error: "Please sign in to upgrade." };

    const userSubscription = await getUserSubscription();

    // Gifted Pro has no Stripe customer to manage
    if (
      userSubscription?.stripeCustomerId?.startsWith(GIFTED_SUBSCRIPTION_PREFIX)
    )
      return { error: "This account has gifted Pro." };

    const returnUrl = shopReturnUrl();

    // Active paid subscribers manage billing in the Stripe portal
    if (userSubscription?.isActive && userSubscription.stripeCustomerId) {
      const stripeSession = await stripe.billingPortal.sessions.create({
        customer: userSubscription.stripeCustomerId,
        return_url: returnUrl,
      });

      if (!stripeSession.url)
        return { error: "Could not open billing portal." };
      return { data: stripeSession.url };
    }

    const email = user.emailAddresses?.[0]?.emailAddress;
    if (!email) return { error: "Add an email to your account to upgrade." };

    // checkout
    const stripeSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer_email: email,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            product_data: {
              name: "Bolo Pro",
              description: "Unlimited hearts.",
            },
            unit_amount: 2000, // $20.00 USD
            recurring: {
              interval: "month",
            },
          },
        },
      ],
      metadata: {
        userId,
      },
      success_url: returnUrl,
      cancel_url: returnUrl,
    });

    if (!stripeSession.url) return { error: "Could not start checkout." };
    return { data: stripeSession.url };
  } catch (error) {
    console.error("[createStripeUrl]", error);
    return { error: stripeMessage(error) };
  }
};
