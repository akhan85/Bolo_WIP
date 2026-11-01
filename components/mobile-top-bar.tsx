import { ClerkLoaded, UserButton } from "@clerk/nextjs";
import { InfinityIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

type MobileTopBarProps = {
  courseImageSrc?: string;
  courseTitle?: string;
  points?: number;
  hearts?: number;
  hasActiveSubscription: boolean;
};

// Phone / tablet header: course, XP and hearts are always in view.
export const MobileTopBar = ({
  courseImageSrc,
  courseTitle,
  points,
  hearts,
  hasActiveSubscription,
}: MobileTopBarProps) => {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b-2 bg-white lg:hidden">
      <div className="mx-auto flex h-[60px] max-w-2xl items-center justify-between gap-x-2 px-4">
        <Link href="/learn" className="flex items-center gap-x-2">
          <Image src="/mascot.svg" alt="" height={32} width={32} />
          <span className="text-xl font-extrabold tracking-wide text-green-600">
            Bolo
          </span>
        </Link>

        <div className="flex items-center gap-x-1 sm:gap-x-3">
          {courseImageSrc && (
            <Link
              href="/courses"
              aria-label={`Course: ${courseTitle}`}
              className="rounded-lg p-1.5 transition hover:bg-slate-100"
            >
              <Image
                src={courseImageSrc}
                alt=""
                width={28}
                height={21}
                className="rounded-[4px] border"
              />
            </Link>
          )}

          {points !== undefined && (
            <Link
              href="/quests"
              aria-label={`${points} XP`}
              className="flex items-center gap-x-1 rounded-lg p-1.5 font-extrabold text-orange-500 transition hover:bg-slate-100"
            >
              <Image src="/points.svg" alt="" height={24} width={24} />
              {points}
            </Link>
          )}

          {hearts !== undefined && (
            <Link
              href="/shop"
              aria-label={
                hasActiveSubscription ? "Unlimited hearts" : `${hearts} hearts`
              }
              className="flex items-center gap-x-1 rounded-lg p-1.5 font-extrabold text-rose-500 transition hover:bg-slate-100"
            >
              <Image src="/heart.svg" alt="" height={22} width={22} />
              {hasActiveSubscription ? (
                <InfinityIcon className="h-5 w-5 stroke-[3]" />
              ) : (
                hearts
              )}
            </Link>
          )}

          <div className="ms-1 flex h-8 w-8 items-center justify-center">
            <ClerkLoaded>
              <UserButton afterSignOutUrl="/" />
            </ClerkLoaded>
          </div>
        </div>
      </div>
    </header>
  );
};
