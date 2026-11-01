"use server";

import { auth, currentUser } from "@clerk/nextjs";

import { GIFTED_SUBSCRIPTION_PREFIX } from "@/constants";
import { getUserSubscription } from "@/db/queries";
import { stripe } from "@/lib/stripe";
import { absoluteUrl } from "@/lib/utils";

const returnUrl = absoluteUrl("/shop");

export const createStripeUrl = async () => {
  try {
    const { userId } = auth();
    const user = await currentUser();

    if (!userId || !user) return { error: "Please sign in to upgrade." };

    const userSubscription = await getUserSubscription();

    // Gifted Pro has no Stripe customer to manage
    if (
      userSubscription?.stripeCustomerId?.startsWith(GIFTED_SUBSCRIPTION_PREFIX)
    )
      return { error: "This account has gifted Pro." };

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

    const email = user.emailAddresses[0]?.emailAddress;
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
            currency: "USD",
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
    return { error: "Something went wrong." };
  }
};
