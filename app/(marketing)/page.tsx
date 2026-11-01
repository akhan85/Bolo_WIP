import {
  ClerkLoaded,
  ClerkLoading,
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
} from "@clerk/nextjs";
import { BookOpen, Loader, Mic, Timer } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";

const FEATURES = [
  {
    icon: Mic,
    title: "Speak from day one",
    text: "Start with real greetings and everyday phrases, with audio for every word.",
    color: "bg-green-100 text-green-600",
  },
  {
    icon: BookOpen,
    title: "Read the script, step by step",
    text: "Learn the Urdu alphabet three letters at a time, reading real words as you go.",
    color: "bg-sky-100 text-sky-600",
  },
  {
    icon: Timer,
    title: "Five minutes a day",
    text: "Short, game-like lessons with hearts, XP and quests to keep you coming back.",
    color: "bg-orange-100 text-orange-600",
  },
];

export default function MarketingPage() {
  return (
    <div className="w-full">
      {/* Hero */}
      <section className="mx-auto flex w-full max-w-[1040px] flex-col items-center gap-8 px-4 py-10 lg:flex-row lg:gap-16 lg:py-16">
        <div className="relative h-[220px] w-[220px] shrink-0 sm:h-[280px] sm:w-[280px] lg:h-[400px] lg:w-[400px]">
          <Image src="/hero.svg" alt="" fill priority />
        </div>

        <div className="flex flex-col items-center gap-y-6 text-center lg:items-start lg:text-start">
          <p
            lang="ur"
            dir="rtl"
            className="text-3xl font-bold text-green-600 sm:text-4xl"
          >
            بولو
          </p>
          <h1 className="max-w-[520px] text-3xl font-black leading-tight text-neutral-700 sm:text-4xl lg:text-5xl">
            The fun, friendly way to learn Urdu.
          </h1>
          <p className="max-w-[460px] text-lg text-neutral-500">
            Bite-sized lessons that get you speaking first, then reading. Made
            for complete beginners.
          </p>

          <div className="flex w-full max-w-[340px] flex-col gap-y-3">
            <ClerkLoading>
              <Loader className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
            </ClerkLoading>

            <ClerkLoaded>
              <SignedOut>
                <SignUpButton
                  mode="modal"
                  afterSignInUrl="/learn"
                  afterSignUpUrl="/learn"
                >
                  <Button size="lg" variant="secondary" className="w-full">
                    Get started for free
                  </Button>
                </SignUpButton>

                <SignInButton
                  mode="modal"
                  afterSignInUrl="/learn"
                  afterSignUpUrl="/learn"
                >
                  <Button size="lg" variant="default" className="w-full">
                    I already have an account
                  </Button>
                </SignInButton>
              </SignedOut>

              <SignedIn>
                <Button
                  size="lg"
                  variant="secondary"
                  className="w-full"
                  asChild
                >
                  <Link href="/learn">Continue learning</Link>
                </Button>
              </SignedIn>
            </ClerkLoaded>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t-2 bg-slate-50">
        <div className="mx-auto grid w-full max-w-[1040px] gap-4 px-4 py-12 sm:grid-cols-3 lg:py-16">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="rounded-2xl border-2 border-b-4 bg-white p-6"
            >
              <div
                className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${feature.color}`}
              >
                <feature.icon className="h-6 w-6" />
              </div>
              <h2 className="mb-2 text-lg font-extrabold text-neutral-700">
                {feature.title}
              </h2>
              <p className="text-neutral-500">{feature.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* A taste of lesson 1 */}
      <section className="mx-auto flex w-full max-w-[1040px] flex-col items-center gap-6 px-4 py-12 text-center lg:py-16">
        <h2 className="text-2xl font-black text-neutral-700 sm:text-3xl">
          Your first word
        </h2>
        <div className="w-full max-w-sm rounded-2xl border-2 border-b-4 px-6 py-8">
          <p className="mb-3 text-xs font-extrabold uppercase tracking-widest text-sky-500">
            New phrase
          </p>
          <p className="text-3xl font-black text-neutral-700">
            assalam-o-alaikum
          </p>
          <p lang="ur" className="mt-2 text-2xl text-neutral-400">
            السلام علیکم
          </p>
          <p className="mt-3 text-neutral-500">
            means <span className="font-bold">hello (peace be upon you)</span>
          </p>
        </div>
      </section>
    </div>
  );
}
