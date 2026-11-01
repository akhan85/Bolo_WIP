import { neon } from "@neondatabase/serverless";
import "dotenv/config";
import { eq, ilike, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";

import { GIFTED_SUBSCRIPTION_PREFIX as MANUAL_PREFIX } from "../constants";
import * as schema from "../db/schema";

// Gives (or removes) free Pro - unlimited hearts - without going through
// Stripe. Useful for test accounts, family and reviewers.
//
//   npm run pro -- list                      learners and their Pro status
//   npm run pro -- grant <user id or name>   free Pro for 10 years
//   npm run pro -- grant <user> --months 1   free Pro for a month
//   npm run pro -- revoke <user id or name>  remove free Pro
//
// Gifted subscriptions are marked with a "manual_" prefix so they are never
// confused with real Stripe ones (and revoke never touches a paid one).

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

const findUser = async (query: string) => {
  if (query.startsWith("user_")) return { userId: query, userName: query };

  const matches = await db.query.userProgress.findMany({
    where: or(
      eq(schema.userProgress.userId, query),
      ilike(schema.userProgress.userName, `%${query}%`)
    ),
  });
  if (matches.length === 1) return matches[0];
  if (!matches.length)
    throw new Error(
      `No learner matches "${query}". Run "npm run pro -- list", or use their Clerk user id (user_...).`
    );
  throw new Error(
    `"${query}" matches ${matches.length} learners: ${matches.map((m) => `${m.userName} (${m.userId})`).join(", ")}. Use the user id instead.`
  );
};

const list = async () => {
  const [learners, subs] = await Promise.all([
    db.query.userProgress.findMany(),
    db.query.userSubscription.findMany(),
  ]);
  const byUser = new Map(subs.map((s) => [s.userId, s]));

  console.log("Name | User id | XP | Pro");
  for (const l of learners) {
    const sub = byUser.get(l.userId);
    const pro = !sub
      ? "-"
      : `${sub.stripeCustomerId.startsWith(MANUAL_PREFIX) ? "gifted" : "paid"} until ${sub.stripeCurrentPeriodEnd.toDateString()}`;
    console.log(`${l.userName} | ${l.userId} | ${l.points} | ${pro}`);
  }
  if (!learners.length)
    console.log("No learners yet - they appear after choosing a course.");
};

const grant = async (query: string, months: number) => {
  const user = await findUser(query);
  const existing = await db.query.userSubscription.findFirst({
    where: eq(schema.userSubscription.userId, user.userId),
  });
  if (existing && !existing.stripeCustomerId.startsWith(MANUAL_PREFIX))
    throw new Error(`${user.userName} already has a paid subscription.`);

  const until = new Date();
  until.setMonth(until.getMonth() + months);

  const values = {
    userId: user.userId,
    stripeCustomerId: `${MANUAL_PREFIX}${user.userId}`,
    stripeSubscriptionId: `${MANUAL_PREFIX}${user.userId}`,
    stripePriceId: `${MANUAL_PREFIX}pro`,
    stripeCurrentPeriodEnd: until,
  };

  if (existing)
    await db
      .update(schema.userSubscription)
      .set(values)
      .where(eq(schema.userSubscription.userId, user.userId));
  else await db.insert(schema.userSubscription).values(values);

  console.log(`✓ ${user.userName} has free Pro until ${until.toDateString()}.`);
};

const revoke = async (query: string) => {
  const user = await findUser(query);
  const existing = await db.query.userSubscription.findFirst({
    where: eq(schema.userSubscription.userId, user.userId),
  });
  if (!existing) return console.log(`${user.userName} doesn't have Pro.`);
  if (!existing.stripeCustomerId.startsWith(MANUAL_PREFIX))
    throw new Error(
      `${user.userName} has a paid Stripe subscription - cancel it in Stripe instead.`
    );

  await db
    .delete(schema.userSubscription)
    .where(eq(schema.userSubscription.userId, user.userId));
  console.log(`✓ Removed free Pro from ${user.userName}.`);
};

const main = async () => {
  const [command, query] = process.argv.slice(2);
  const monthsArg = process.argv.indexOf("--months");
  const months =
    monthsArg === -1 ? 120 : Number(process.argv[monthsArg + 1]) || 120;

  try {
    if (command === "list") await list();
    else if (command === "grant" && query) await grant(query, months);
    else if (command === "revoke" && query) await revoke(query);
    else
      console.log(
        "Usage: npm run pro -- list | grant <user> [--months N] | revoke <user>"
      );
  } catch (error) {
    console.error(`✗ ${(error as Error).message}`);
    process.exit(1);
  }
};

void main();
