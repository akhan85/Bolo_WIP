"use server";

import { auth, currentUser } from "@clerk/nextjs/server";

import { stripe } from "@/lib/stripe";

import { absoluteUrl } from "@/lib/utils";

import { getUserSubscription } from "@/db/queries";

const returnUrl = absoluteUrl("/shop");

export const createStripeUrl = async () => {
  const { userId } = await auth();
  const user = await currentUser();

  if (!userId || !user) throw new Error("Unauthorized");

  const userSubscription = await getUserSubscription();

  if (userSubscription && userSubscription.stripeCustomerId) {
    const stripeSession = await stripe.billingPortal.sessions.create({
      customer: userSubscription.stripeCustomerId,
      return_url: returnUrl,
    });

    return { data: stripeSession.url };
  }

  const stripeSession = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    customer_email: user.emailAddresses[0].emailAddress,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "USD",
          product_data: {
            name: "Bolo Pro",
            description: "Unlock unlimited hearts",
          },
          unit_amount: 999, // $9.99 USD
          recurring: {
            interval: "month",
          },
        },
      },
    ],
    metadata: {
      userId,
    },
    //success_url: returnUrl, this was how it was in the video, below code is changes via perplexity
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/shop?success=true`,
    //cancel_url: returnUrl, see above
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/shop?canceled=true`,
  });

  return { data: stripeSession.url };
};