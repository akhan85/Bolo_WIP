import fs from "fs";
import path from "path";

// The curriculum files were written at different times in different shapes.
// This module flattens all of them into one predictable structure so the
// seed script and the asset report never have to care about the variants.

export type ItemKind = "letter" | "word" | "phrase" | "sentence" | "reading";

export type Item = {
  urdu: string;
  roman?: string;
  english?: string;
  kind: ItemKind;
  image?: string; // explicit path under /public, e.g. "/images/apple.svg"
  audio?: string; // explicit file name under /public/sound
};

export type Quiz = {
  question: string;
  options: string[];
  answer: string;
};

export type Lesson = {
  title: string;
  items: Item[]; // new vocabulary / phrases to learn
  lines: Item[]; // dialogue lines (practised in context)
  quizzes: Quiz[];
};

export type Unit = {
  title: string;
  description: string;
  lessons: Lesson[];
};

const ROOT = process.cwd();
const STAGE_1_FILE = path.join(ROOT, "urdu_curriculum.json");
const CURRICULUM_DIR = path.join(ROOT, "curriculum");

const isBlank = (s?: string) => !s || !s.trim() || s.trim() === "—";

const clean = (s?: string) => (isBlank(s) ? undefined : s!.trim());

const kindFor = (
  type: string | undefined,
  urdu: string,
  english = ""
): ItemKind => {
  if (type === "sentence" || type === "reading_sentence") return "sentence";
  // Anything punctuated like a full sentence is quizzed against sentences
  if (/[۔؟!]$/.test(urdu.trim()) || /[.?!]$/.test(english.trim()))
    return "sentence";
  if (type === "phrase") return "phrase";
  // A single Urdu letter, ignoring joiners, do-chashmi heh and vowel marks
  if (urdu.replace(/[\sـھ\u064B-\u0652\u0670]/g, "").length === 1)
    return "letter";
  return urdu.trim().includes(" ") ? "phrase" : "word";
};

const item = (
  raw: any,
  type?: string,
  fields = { urdu: "urdu", roman: "roman", english: "english" }
): Item | null => {
  const urdu = clean(raw?.[fields.urdu]);
  if (!urdu) return null;

  const english = clean(raw[fields.english]);
  const roman = clean(raw[fields.roman]);
  const kind = english ? kindFor(type ?? raw.type, urdu, english) : "reading";

  return {
    urdu,
    roman,
    english,
    kind,
    image: clean(raw.image),
    audio: clean(raw.audio),
  };
};

const push = (list: Item[], i: Item | null) => {
  if (i && !list.some((x) => x.urdu === i.urdu)) list.push(i);
};

const normalizeLesson = (l: any): Lesson => {
  const title = l.title ?? l.lesson_name ?? l.lesson_title ?? "Untitled Lesson";
  const items: Item[] = [];
  const lines: Item[] = [];
  const quizzes: Quiz[] = [];

  // Variant 1 & 2: `cards`
  for (const c of l.cards ?? []) {
    switch (c.type) {
      case "word":
      case "vocab":
      case "phrase":
      case "sentence":
      case "reading":
      case "reading_sentence":
        push(items, item(c));
        break;
      case "contrast":
      case "match":
      case "matching":
        (c.items ?? c.pairs ?? []).forEach((p: any) =>
          push(items, item({ ...p, english: p.english ?? undefined }))
        );
        break;
      case "dialogue":
        (c.turns ?? []).forEach((t: any) => push(lines, item(t, "sentence")));
        break;
      case "quiz":
        if (c.question && c.options?.length && c.answer)
          quizzes.push({
            question: c.question,
            options: c.options,
            answer: c.answer,
          });
        break;
      // explanation / exercise cards have no UI yet
    }
  }

  // Stage 2+ vocabulary goes first so words are taught before phrases using them
  (l.vocab ?? []).forEach((v: any) => push(items, item(v, "word")));

  // Variant 3: `vocabulary`, `phrases`, `micro_dialogues`
  (l.vocabulary ?? []).forEach((v: any) => push(items, item(v, "word")));
  (l.phrases ?? []).forEach((p: any) => push(items, item(p, "phrase")));
  (l.micro_dialogues ?? []).forEach((d: any) =>
    (d.lines ?? []).forEach((t: any) => push(lines, item(t, "sentence")))
  );

  // Variant 4: `screens`
  const screenFields = {
    urdu: "urdu_text",
    roman: "roman",
    english: "english_text",
  };
  for (const s of l.screens ?? []) {
    switch (s.type) {
      case "vocabulary":
        push(items, item(s, "word", screenFields));
        break;
      case "dialogue":
        push(lines, item(s, "sentence", screenFields));
        break;
      case "match":
      case "matching":
        (s.pairs ?? []).forEach((p: any) => push(items, item(p)));
        break;
      case "multiple_choice":
        if (s.question && s.options?.length) {
          const answer = s.options.find((o: any) => o.correct)?.text;
          if (answer)
            quizzes.push({
              question: s.question,
              options: s.options.map((o: any) => o.text),
              answer,
            });
        }
        break;
      // speaking / ordering screens have no UI yet
    }
  }

  // Stage 2+ format (curriculum/*.json): `vocab`, `phrases`, `dialogue`, `quiz`
  (l.dialogue ?? []).forEach((t: any) => push(lines, item(t, "sentence")));
  for (const q of l.quiz ?? []) quizzes.push(q);

  return { title, items, lines, quizzes };
};

const normalizeUnit = (u: any, stageLabel: string): Unit => ({
  title: u.title ?? u.unit_name ?? u.unit_title ?? "Untitled Unit",
  description: u.description ?? u.unit_description ?? stageLabel,
  lessons: (u.lessons ?? []).map(normalizeLesson),
});

// Some units are wrapped as `{ stage, units: [...] }` - unwrap them.
const flattenUnits = (units: any[]): any[] =>
  units.flatMap((u) => (Array.isArray(u.units) ? flattenUnits(u.units) : [u]));

export const loadCurriculum = (): Unit[] => {
  const units: Unit[] = [];

  const stage1 = JSON.parse(fs.readFileSync(STAGE_1_FILE, "utf8"));
  for (const stage of stage1.course.stages) {
    const label = `Stage ${stage.id} - ${stage.name}`;
    flattenUnits(stage.units).forEach((u) =>
      units.push(normalizeUnit(u, label))
    );
  }

  if (fs.existsSync(CURRICULUM_DIR)) {
    const files = fs
      .readdirSync(CURRICULUM_DIR)
      .filter((f) => f.endsWith(".json"))
      .sort();

    for (const file of files) {
      const data = JSON.parse(
        fs.readFileSync(path.join(CURRICULUM_DIR, file), "utf8")
      );
      const label = `Stage ${data.stage.id} - ${data.stage.name}`;
      data.units.forEach((u: any) => units.push(normalizeUnit(u, label)));
    }
  }

  return units;
};
