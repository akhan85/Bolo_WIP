import { useEffect, useMemo, useState } from "react";

import { challengeOptions } from "@/db/schema";
import { cn, seededDerangement, seededShuffle } from "@/lib/utils";

type MatchPairsProps = {
  challengeId: number;
  options: (typeof challengeOptions.$inferSelect)[];
  onComplete: () => void;
  disabled?: boolean;
};

const play = (src: string | null) => {
  if (src) void new Audio(src).play().catch(() => {});
};

// Urdu on one side, meanings on the other. A pair is one option: its `text`
// on the left and its `pair` on the right.
export const MatchPairs = ({
  challengeId,
  options,
  onComplete,
  disabled,
}: MatchPairsProps) => {
  const left = useMemo(
    () => seededShuffle(options, challengeId),
    [options, challengeId]
  );
  // Derange against the left column so a word is never beside its meaning.
  const right = useMemo(
    () => seededDerangement(options, left, challengeId * 7 + 3, (o) => o.id),
    [options, left, challengeId]
  );

  const [leftPick, setLeftPick] = useState<number>();
  const [rightPick, setRightPick] = useState<number>();
  const [matched, setMatched] = useState<number[]>([]);
  const [wrong, setWrong] = useState<[number, number]>();

  useEffect(() => {
    if (leftPick === undefined || rightPick === undefined) return;

    if (leftPick === rightPick) {
      setMatched((prev) => [...prev, leftPick]);
    } else {
      setWrong([leftPick, rightPick]);
      setTimeout(() => setWrong(undefined), 600);
    }
    setLeftPick(undefined);
    setRightPick(undefined);
  }, [leftPick, rightPick]);

  useEffect(() => {
    if (options.length && matched.length === options.length) onComplete();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matched.length, options.length]);

  const tile = (
    id: number,
    side: "left" | "right",
    picked: boolean,
    label: string
  ) => {
    const isMatched = matched.includes(id);
    const isWrong = wrong?.[side === "left" ? 0 : 1] === id;

    return (
      <button
        key={`${side}-${id}`}
        type="button"
        disabled={disabled || isMatched}
        dir="auto"
        lang={side === "left" ? "ur" : "en"}
        onClick={() => {
          if (side === "left") {
            setLeftPick(id);
            play(options.find((o) => o.id === id)?.audioSrc ?? null);
          } else setRightPick(id);
        }}
        className={cn(
          "min-h-[56px] w-full rounded-xl border-2 border-b-4 px-3 py-2 text-neutral-700 transition hover:bg-black/5",
          side === "left" ? "text-xl lg:text-2xl" : "text-sm lg:text-base",
          picked && "border-sky-300 bg-sky-100 text-sky-500",
          isWrong && "border-rose-300 bg-rose-100 text-rose-500",
          isMatched &&
            "border-green-200 bg-green-50 text-green-400 opacity-60 hover:bg-green-50"
        )}
      >
        {label}
      </button>
    );
  };

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="flex flex-col gap-y-3">
        {left.map((o) => tile(o.id, "left", leftPick === o.id, o.text))}
      </div>
      <div className="flex flex-col gap-y-3">
        {right.map((o) =>
          tile(o.id, "right", rightPick === o.id, o.pair ?? "")
        )}
      </div>
    </div>
  );
};
