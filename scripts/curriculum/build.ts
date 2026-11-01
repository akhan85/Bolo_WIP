import fs from "fs";
import path from "path";

import type { Item, Lesson, Unit } from "./load";

// Turns normalized lessons into challenges (questions) and options, and works
// out which audio / image files each one should use.
//
// Lesson flow, per lesson:
//   1. Recognise  - see/hear each new Urdu item, pick its English meaning
//   2. Produce    - see the English, pick the right Urdu
//   3. Context    - understand each dialogue line
//   4. Check      - the hand-written quiz questions from the curriculum

export type BuiltOption = {
  text: string;
  correct: boolean;
  imageSrc: string | null;
  audioSrc: string | null;
};

export type BuiltChallenge = {
  type: "SELECT" | "ASSIST";
  question: string;
  hint: string | null;
  audioSrc: string | null;
  options: BuiltOption[];
};

export type MissingAudio = {
  file: string; // path under /public
  urdu: string;
  roman?: string;
  english?: string;
  kind: Item["kind"];
  usedIn: string; // "Unit title › Lesson title"
};

export type MissingImage = {
  file: string;
  english?: string;
  usedIn: string;
};

const PUBLIC_DIR = path.join(process.cwd(), "public");
const exists = (publicPath: string) =>
  fs.existsSync(path.join(PUBLIC_DIR, publicPath));

const OPTIONS_PER_CHALLENGE = 3;

// --- File naming -----------------------------------------------------------

// Romanized text → audio file name. Dotted letters get doubled so that
// e.g. ٹ (ṭe) and ت (te) don't collide on the same file.
export const audioSlug = (roman: string) =>
  roman
    .toLowerCase()
    .replace(/ṭ/g, "tt")
    .replace(/ḍ/g, "dd")
    .replace(/ṛ/g, "rr")
    .replace(/ḥ/g, "hh")
    .replace(/ṣ/g, "ss")
    .replace(/ẓ/g, "zz")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);

// English meaning → image file name (kept compatible with the existing
// files in /public such as breathy_h.svg and retroflex_t.svg).
export const imageSlug = (english: string) =>
  english
    .toLowerCase()
    .replace(/ /g, "_")
    .replace(/[^a-z0-9_]/g, "");

// --- Seeded randomness so re-seeding gives the same lessons -----------------

const hash = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++)
    h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};

const rng = (seed: string) => {
  let a = hash(seed);
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const shuffle = <T>(list: T[], random: () => number) => {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const same = (a?: string, b?: string) =>
  !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();

// --- Builder ---------------------------------------------------------------

export const createBuilder = (units: Unit[]) => {
  const missingAudio = new Map<string, MissingAudio>();
  const missingImages = new Map<string, MissingImage>();

  const allItems = units.flatMap((u) =>
    u.lessons.flatMap((l) => [...l.items, ...l.lines])
  );
  const byUrdu = new Map(allItems.map((i) => [i.urdu, i]));

  const audioFor = (i: Item, usedIn: string): string | null => {
    // Name by pronunciation; fall back to the meaning if there's no roman.
    const slug = audioSlug(i.roman ?? i.english ?? "");
    const file = i.audio
      ? `/sound/${i.audio}`
      : slug
        ? `/sound/${slug}.mp3`
        : null;
    if (!file) return null;
    if (exists(file)) return file;

    if (!missingAudio.has(file))
      missingAudio.set(file, {
        file,
        urdu: i.urdu,
        roman: i.roman,
        english: i.english,
        kind: i.kind,
        usedIn,
      });
    return null;
  };

  const imageFor = (i: Item, usedIn: string): string | null => {
    if (i.image) {
      if (exists(i.image)) return i.image;
      if (!missingImages.has(i.image))
        missingImages.set(i.image, {
          file: i.image,
          english: i.english,
          usedIn,
        });
      return null;
    }
    // Only single words / letters get pictures, and only if one exists.
    if (!i.english || (i.kind !== "word" && i.kind !== "letter")) return null;
    const slug = imageSlug(i.english);
    if (!slug) return null;
    for (const candidate of [`/${slug}.svg`, `/images/${slug}.svg`])
      if (exists(candidate)) return candidate;
    return null;
  };

  // Pick distractor items: same lesson first, then same unit, then anywhere.
  const distractors = (
    target: Item,
    pools: Item[][],
    field: "english" | "urdu" | "roman",
    random: () => number
  ) => {
    const picked: Item[] = [];
    const usable = (c: Item) =>
      !!c[field] &&
      !same(c.urdu, target.urdu) &&
      !same(c.english, target.english) &&
      !same(c[field], target[field]) &&
      !picked.some((p) => same(p[field], c[field]));

    for (const strictGroup of [true, false]) {
      for (const pool of pools) {
        const candidates = shuffle(
          pool.filter((c) => !strictGroup || c.kind === target.kind),
          random
        );
        for (const c of candidates) {
          if (picked.length >= OPTIONS_PER_CHALLENGE - 1) return picked;
          if (usable(c)) picked.push(c);
        }
      }
    }
    return picked;
  };

  const buildLesson = (unit: Unit, lesson: Lesson): BuiltChallenge[] => {
    const usedIn = `${unit.title} › ${lesson.title}`;
    const random = rng(usedIn);
    const lessonPool = [...lesson.items, ...lesson.lines];
    const unitPool = unit.lessons.flatMap((l) => [...l.items, ...l.lines]);
    const pools = [lessonPool, unitPool, allItems];

    const urduOption = (i: Item, correct: boolean): BuiltOption => ({
      text: i.urdu,
      correct,
      audioSrc: audioFor(i, usedIn),
      imageSrc: imageFor(i, usedIn),
    });

    // English options never carry Urdu audio - that would give the answer away.
    const englishOption = (i: Item, correct: boolean): BuiltOption => ({
      text: i.english!,
      correct,
      audioSrc: null,
      imageSrc: i.kind === "letter" ? null : imageFor(i, usedIn),
    });

    const recognise = (i: Item): BuiltChallenge | null => {
      if (i.kind === "reading") {
        if (!i.roman) return null;
        const others = distractors(i, pools, "roman", random);
        if (!others.length) return null;
        return {
          type: "SELECT",
          question: `How do you read "${i.urdu}"?`,
          hint: null,
          audioSrc: null,
          options: shuffle(
            [i, ...others].map((o) => ({
              text: o.roman!,
              correct: o === i,
              audioSrc: o === i ? audioFor(i, usedIn) : null,
              imageSrc: null,
            })),
            random
          ),
        };
      }

      const others = distractors(i, pools, "english", random);
      if (!others.length) return null;
      return {
        type: "ASSIST",
        question: i.urdu,
        hint: i.roman ?? null,
        audioSrc: audioFor(i, usedIn),
        options: shuffle(
          [
            englishOption(i, true),
            ...others.map((o) => englishOption(o, false)),
          ],
          random
        ),
      };
    };

    const produce = (i: Item): BuiltChallenge | null => {
      if (!i.english || i.kind === "reading") return null;
      const others = distractors(i, pools, "urdu", random);
      if (!others.length) return null;
      return {
        type: "SELECT",
        question:
          i.kind === "letter"
            ? `Which letter is "${i.english}"?`
            : `Which one means "${i.english}"?`,
        hint: null,
        audioSrc: null,
        options: shuffle(
          [urduOption(i, true), ...others.map((o) => urduOption(o, false))],
          random
        ),
      };
    };

    const check = (q: Lesson["quizzes"][number]): BuiltChallenge => ({
      type: "SELECT",
      question: q.question,
      hint: null,
      audioSrc: null,
      options: q.options.map((text) => {
        const known = byUrdu.get(text.trim());
        return {
          text,
          correct: text === q.answer,
          audioSrc: known ? audioFor(known, usedIn) : null,
          imageSrc: null,
        };
      }),
    });

    return [
      ...lesson.items.map(recognise),
      ...shuffle(lesson.items, random).map(produce),
      ...lesson.lines.map(recognise),
      // A quiz whose answer isn't among its options would leave the learner stuck.
      ...lesson.quizzes.filter((q) => q.options.includes(q.answer)).map(check),
    ].filter((c): c is BuiltChallenge => !!c);
  };

  return {
    buildLesson,
    // Both lists are in curriculum order, so they read like the course.
    missingAudio: () => Array.from(missingAudio.values()),
    missingImages: () => Array.from(missingImages.values()),
  };
};
