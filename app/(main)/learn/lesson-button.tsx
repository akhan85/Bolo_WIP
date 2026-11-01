"use client";

import { useEffect, useRef } from "react";

import { Check, Crown, Star } from "lucide-react";
import Link from "next/link";
import { CircularProgressbarWithChildren } from "react-circular-progressbar";

import type { UnitTheme } from "@/lib/unit-themes";
import { cn } from "@/lib/utils";

import "react-circular-progressbar/dist/styles.css";

type LessonButtonProps = {
  id: number;
  title: string;
  theme: UnitTheme;
  index: number;
  totalCount: number;
  locked?: boolean;
  current?: boolean;
  percentage: number;
};

export const LessonButton = ({
  id,
  title,
  theme,
  index,
  totalCount,
  locked,
  current,
  percentage,
}: LessonButtonProps) => {
  const cycleLength = 8;
  const cycleIndex = index % cycleLength;

  let indentationLevel;

  if (cycleIndex <= 2) indentationLevel = cycleIndex;
  else if (cycleIndex <= 4) indentationLevel = 4 - cycleIndex;
  else if (cycleIndex <= 6) indentationLevel = 4 - cycleIndex;
  else indentationLevel = cycleIndex - 8;

  const rightPosition = indentationLevel * 40;

  const isFirst = index === 0;
  const isLast = index === totalCount;
  const isCompleted = !current && !locked;

  const Icon = isCompleted ? Check : isLast ? Crown : Star;

  const href = isCompleted ? `/lesson/${id}` : "/lesson";
  const state = locked ? "locked" : isCompleted ? "completed" : "start";
  const nodeRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (!current) return;

    const scroll = () =>
      nodeRef.current?.scrollIntoView({
        block: "center",
        inline: "nearest",
        behavior: "auto",
      });

    scroll();
    const frame = requestAnimationFrame(scroll);
    const timer = window.setTimeout(scroll, 50);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [current]);

  // A round, chunky "3D" button in the unit's colour, or grey when locked
  const circle = cn(
    "flex h-[70px] w-[70px] items-center justify-center rounded-full border-b-8 text-white transition active:translate-y-0.5 active:border-b-4",
    locked ? "border-neutral-300 bg-neutral-200" : theme.button
  );

  return (
    <Link
      ref={nodeRef}
      id={current ? "current-lesson" : undefined}
      href={href}
      title={`${title} (${state})`}
      aria-label={`${title}, ${state}`}
      aria-disabled={locked}
      tabIndex={locked ? -1 : undefined}
      style={{ pointerEvents: locked ? "none" : "auto" }}
      className="scroll-mt-32 rounded-full focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-300"
    >
      <div
        className="relative"
        style={{
          right: `${rightPosition}px`,
          marginTop: isFirst && !isCompleted ? 60 : 24,
        }}
      >
        {current ? (
          <div className="relative h-[102px] w-[102px]">
            <div className="absolute -top-6 left-2.5 z-10 animate-bounce rounded-xl border-2 bg-white px-3 py-2.5 font-bold uppercase tracking-wide text-green-500">
              Start
              <div
                className="absolute -bottom-2 left-1/2 h-0 w-0 -translate-x-1/2 transform border-x-8 border-t-8 border-x-transparent"
                aria-hidden
              />
            </div>
            <CircularProgressbarWithChildren
              value={Number.isNaN(percentage) ? 0 : percentage}
              styles={{
                path: {
                  stroke: theme.ring,
                },
                trail: {
                  stroke: "#e5e7eb",
                },
              }}
            >
              <div className={circle}>
                <Icon
                  className={cn(
                    "h-10 w-10",
                    locked
                      ? "fill-neutral-400 stroke-neutral-400 text-neutral-400"
                      : "fill-white text-white",
                    isCompleted && "fill-none stroke-[4]"
                  )}
                />
              </div>
            </CircularProgressbarWithChildren>
          </div>
        ) : (
          <div className={circle}>
            <Icon
              className={cn(
                "h-10 w-10",
                locked
                  ? "fill-neutral-400 stroke-neutral-400 text-neutral-400"
                  : "fill-white text-white",
                isCompleted && "fill-none stroke-[4]"
              )}
            />
          </div>
        )}
      </div>
    </Link>
  );
};
