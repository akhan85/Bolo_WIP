"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

import { NAV_ITEMS } from "./nav-items";

// Phone / tablet navigation, like a native app's tab bar.
export const BottomNav = () => {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t-2 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden">
      <ul className="mx-auto flex max-w-lg items-stretch justify-around">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className="flex flex-col items-center gap-y-1 py-2"
              >
                <span
                  className={cn(
                    "flex h-10 w-14 items-center justify-center rounded-xl border-2 border-transparent transition",
                    active && "border-sky-300 bg-sky-50"
                  )}
                >
                  <Image src={item.iconSrc} alt="" height={28} width={28} />
                </span>
                <span
                  className={cn(
                    "text-[11px] font-bold uppercase tracking-wide text-neutral-400",
                    active && "text-sky-500"
                  )}
                >
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};
