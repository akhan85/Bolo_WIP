import Stripe from "stripe";

const stripeKey =
  process.env.STRIPE_API_SECRET_KEY || process.env.STRIPE_API_KEY || "";

export const stripe = new Stripe(stripeKey, {
  apiVersion: "2023-10-16",
  typescript: true,
});
