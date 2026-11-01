import { ClerkLoading, ClerkLoaded, UserButton } from "@clerk/nextjs";
import { Loader } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";

import { NAV_ITEMS } from "./nav-items";
import { SidebarItem } from "./sidebar-item";

type SidebarProps = {
  className?: string;
};

export const Sidebar = ({ className }: SidebarProps) => {
  return (
    <div
      className={cn(
        "start-0 top-0 flex h-full flex-col border-e-2 bg-white px-4 lg:fixed lg:w-[256px]",
        className
      )}
    >
      <Link href="/learn">
        <div className="flex items-center gap-x-3 pb-7 ps-4 pt-8">
          <Image src="/mascot.svg" alt="Mascot" height={40} width={40} />

          <span className="text-3xl font-black tracking-wide text-green-600">
            Bolo
          </span>
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-y-2">
        {NAV_ITEMS.map((item) => (
          <SidebarItem key={item.href} {...item} />
        ))}
      </div>

      <div className="p-4">
        <ClerkLoading>
          <Loader className="h-5 w-5 animate-spin text-muted-foreground" />
        </ClerkLoading>

        <ClerkLoaded>
          <UserButton
            afterSignOutUrl="/"
            appearance={{
              elements: { userButtonPopoverCard: { pointerEvents: "initial" } },
            }}
          />
        </ClerkLoaded>
      </div>
    </div>
  );
};
