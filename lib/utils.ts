import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function absoluteUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_APP_URL}${path}`;
}

const nextSeed = (s: number) => (s * 16807) % 2147483647;

// Shuffle that always gives the same order for the same seed, so tiles don't
// jump around between renders (or between server and client).
export function seededShuffle<T>(list: T[], seed: number) {
  const copy = [...list];
  let s = seed || 1;
  for (let i = copy.length - 1; i > 0; i--) {
    s = nextSeed(s);
    const j = s % (i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Shuffle of `list` where no item stays at the same index as in `relativeTo`.
// Used so match-pair columns never line a word up next to its meaning.
export function seededDerangement<T>(
  list: T[],
  relativeTo: T[],
  seed: number,
  key: (item: T) => unknown = (item) => item
) {
  if (list.length < 2) return [...list];

  const aligned = (a: T[], b: T[]) =>
    a.some((item, i) => key(item) === key(b[i]));

  let s = seed || 1;
  for (let attempt = 0; attempt < 40; attempt++) {
    const copy = [...list];
    for (let i = copy.length - 1; i > 0; i--) {
      s = nextSeed(s);
      const j = s % (i + 1);
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    if (!aligned(copy, relativeTo)) return copy;
  }

  // Rotation is always a derangement for n >= 2 if a full shuffle kept lining up.
  const copy = [...list];
  for (let r = 1; r < copy.length; r++) {
    const rotated = [...copy.slice(r), ...copy.slice(0, r)];
    if (!aligned(rotated, relativeTo)) return rotated;
  }

  return [...copy.slice(1), copy[0]];
}
