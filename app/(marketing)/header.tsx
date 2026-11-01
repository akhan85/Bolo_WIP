import {
  ClerkLoaded,
  ClerkLoading,
  SignInButton,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/nextjs";
import { Loader } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export const Header = () => {
  return (
    <header className="sticky top-0 z-40 h-16 w-full border-b-2 border-slate-200 bg-white/90 px-4 backdrop-blur sm:h-20">
      <div className="mx-auto flex h-full max-w-[1040px] items-center justify-between">
        <Link href="/" className="flex items-center gap-x-3">
          <Image src="/mascot.svg" alt="" height={40} width={40} />

          <span className="text-2xl font-black tracking-wide text-green-600 sm:text-3xl">
            Bolo
          </span>
        </Link>

        <div className="flex gap-x-3">
          <ClerkLoading>
            <Loader className="h-5 w-5 animate-spin text-muted-foreground" />
          </ClerkLoading>
          <ClerkLoaded>
            <SignedIn>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>

            <SignedOut>
              <SignInButton
                mode="modal"
                afterSignInUrl="/learn"
                afterSignUpUrl="/learn"
              >
                <Button variant="ghost">Log in</Button>
              </SignInButton>
            </SignedOut>
          </ClerkLoaded>
        </div>
      </div>
    </header>
  );
};
