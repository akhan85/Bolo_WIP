import { type Dispatch, type SetStateAction, useMemo } from "react";

import { challengeOptions } from "@/db/schema";
import { cn, seededShuffle } from "@/lib/utils";

type WordBankProps = {
  challengeId: number;
  options: (typeof challengeOptions.$inferSelect)[];
  selected: number[]; // option ids, in the order the learner tapped them
  onChange: Dispatch<SetStateAction<number[]>>;
  status: "correct" | "wrong" | "none";
  disabled?: boolean;
};

const tileClass =
  "rounded-xl border-2 border-b-4 bg-white px-3 py-1.5 text-lg text-neutral-700 lg:px-4 lg:text-2xl";

export const WordBank = ({
  challengeId,
  options,
  selected,
  onChange,
  status,
  disabled,
}: WordBankProps) => {
  const bank = useMemo(
    () => seededShuffle(options, challengeId),
    [options, challengeId]
  );
  const byId = new Map(options.map((option) => [option.id, option]));
  const locked = disabled || status !== "none";

  const add = (id: number) => {
    // Functional updates so quick taps can't overwrite each other
    if (!locked) onChange((prev) => (prev.includes(id) ? prev : [...prev, id]));
  };

  const remove = (id: number) => {
    if (!locked) onChange((prev) => prev.filter((s) => s !== id));
  };

  return (
    <div className="flex flex-col gap-y-8">
      {/* Answer line - Urdu reads right to left */}
      <div
        dir="rtl"
        lang="ur"
        className="flex min-h-[64px] flex-wrap items-center gap-2 border-b-2 pb-2 lg:min-h-[76px]"
      >
        {selected.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => remove(id)}
            className={cn(
              tileClass,
              "transition hover:bg-black/5",
              status === "correct" &&
                "border-green-300 bg-green-100 text-green-600",
              status === "wrong" && "border-rose-300 bg-rose-100 text-rose-600"
            )}
          >
            {byId.get(id)?.text}
          </button>
        ))}
      </div>

      {/* Word bank - tapped words leave a grey gap behind */}
      <div dir="rtl" lang="ur" className="flex flex-wrap justify-center gap-2">
        {bank.map((option) =>
          selected.includes(option.id) ? (
            <span
              key={option.id}
              aria-hidden
              className={cn(
                tileClass,
                "border-neutral-200 bg-neutral-200 text-transparent"
              )}
            >
              {option.text}
            </span>
          ) : (
            <button
              key={option.id}
              type="button"
              onClick={() => add(option.id)}
              disabled={locked}
              className={cn(tileClass, "transition hover:bg-black/5")}
            >
              {option.text}
            </button>
          )
        )}
      </div>
    </div>
  );
};

// The correct sentence: correct options in the order they were stored.
export const wordBankAnswer = (
  options: (typeof challengeOptions.$inferSelect)[]
) =>
  options
    .filter((option) => option.correct)
    .sort((a, b) => a.id - b.id)
    .map((option) => option.text);
