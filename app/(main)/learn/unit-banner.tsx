import { NotebookText } from "lucide-react";
import Link from "next/link";

import type { UnitTheme } from "@/lib/unit-themes";
import { cn } from "@/lib/utils";

type UnitBannerProps = {
  order: number;
  title: string;
  description: string;
  theme: UnitTheme;
  isCurrent: boolean;
};

export const UnitBanner = ({
  order,
  title,
  description,
  theme,
  isCurrent,
}: UnitBannerProps) => {
  return (
    <div
      className={cn(
        "flex w-full items-center justify-between gap-x-4 rounded-2xl border-b-4 p-4 text-white sm:p-5",
        theme.banner
      )}
    >
      <div className="min-w-0 space-y-1">
        <p className="text-xs font-extrabold uppercase tracking-widest text-white/80">
          Unit {order}
        </p>
        <h3 className="text-xl font-extrabold sm:text-2xl">{title}</h3>
        <p className="text-sm text-white/90 sm:text-base">{description}</p>
      </div>

      {isCurrent && (
        <Link
          href="/lesson"
          aria-label="Continue the next lesson"
          className="flex shrink-0 items-center gap-x-2 rounded-xl border-2 border-b-4 border-white/40 bg-white/10 px-3 py-2.5 text-sm font-extrabold uppercase tracking-wide transition hover:bg-white/20 active:border-b-2 sm:px-4"
        >
          <NotebookText className="h-5 w-5" />
          <span className="hidden sm:inline">Continue</span>
        </Link>
      )}
    </div>
  );
};
