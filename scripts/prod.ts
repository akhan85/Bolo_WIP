import { neon } from "@neondatabase/serverless";
import "dotenv/config";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "../db/schema";
import fs from "fs";
import path from "path";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

// --- Type Definitions for the Diverse JSON Structure ---

type BaseUnit = {
  lessons: any[];
};

type UnitVariant1 = BaseUnit & { id: string; title: string };
type UnitVariant2 = BaseUnit & { unit_number: number; unit_name: string; stage?: string };
type UnitVariant3 = BaseUnit & { unit_id: string; unit_title: string; unit_description?: string };

type AnyUnit = UnitVariant1 | UnitVariant2 | UnitVariant3;

type BaseLesson = {
  // Common fields if any
};

type LessonVariant1 = BaseLesson & { id: string; title: string; cards: any[] };
type LessonVariant2 = BaseLesson & { lesson_number: number; lesson_name: string; objectives: string[]; cards: any[] };
type LessonVariant3 = BaseLesson & { lesson_id: string; lesson_title: string; goals: string[]; vocabulary: any[]; phrases: any[]; exercises: any };
type LessonVariant4 = BaseLesson & { lesson_id: string; lesson_title: string; lesson_objective: string; screens: any[] };

type AnyLesson = LessonVariant1 | LessonVariant2 | LessonVariant3 | LessonVariant4;

type Curriculum = {
  course: {
    language: string;
    stages: {
      id: number;
      name: string;
      units: AnyUnit[];
    }[];
  };
};

// --- Helper Functions ---

const getUnitTitle = (u: AnyUnit): string => {
  if ('title' in u) return u.title;
  if ('unit_name' in u) return u.unit_name;
  if ('unit_title' in u) return u.unit_title;
  return "Untitled Unit";
};

const getLessonTitle = (l: AnyLesson): string => {
  if ('title' in l) return l.title;
  if ('lesson_name' in l) return l.lesson_name;
  if ('lesson_title' in l) return l.lesson_title;
  return "Untitled Lesson";
};

const normalize = (s: string) => s.trim();

const main = async () => {
  try {
    console.log("Seeding database");

    // Delete all existing data
    await db.delete(schema.userProgress);
    await db.delete(schema.userSubscription);
    await db.delete(schema.challengeOptions);
    await db.delete(schema.challenges);
    await db.delete(schema.lessons);
    await db.delete(schema.units);
    await db.delete(schema.courses);

    // Insert course
    const courses = await db
      .insert(schema.courses)
      .values([{ title: "Urdu", imageSrc: "/pk.svg" }])
      .returning();

    const courseId = courses[0].id;

    // Read and parse the JSON file
    let curriculumData: Curriculum;
    try {
      const data = fs.readFileSync(path.join(process.cwd(), "urdu_curriculum.json"), "utf8");
      curriculumData = JSON.parse(data);
    } catch (e) {
      console.log("Could not find urdu_curriculum.json, trying urdu_curriculum.json.json");
      const data = fs.readFileSync(path.join(process.cwd(), "urdu_curriculum.json.json"), "utf8");
      curriculumData = JSON.parse(data);
    }

    // 1. Build Global Word Map
    const wordMap = new Map<string, { roman: string; english: string }>();
    const englishMap = new Map<string, { roman: string; urdu: string }>(); // Reverse lookup by English

    const addToMap = (urdu: string, roman: string, english: string) => {
      if (urdu && roman && english) {
        wordMap.set(normalize(urdu), { roman, english });
        // Also create reverse lookup by English
        const normalizedEnglish = english.trim().toLowerCase();
        englishMap.set(normalizedEnglish, { roman, urdu });
      }
    };

    // Scan entire curriculum to populate map
    for (const stage of curriculumData.course.stages) {
      for (const unit of stage.units) {
        if (!unit.lessons || !Array.isArray(unit.lessons)) {
          console.log("Problematic Unit:", JSON.stringify(unit, null, 2));
          continue;
        }
        for (const lesson of unit.lessons as AnyLesson[]) {
          // Variant 1 & 2: cards
          if ('cards' in lesson && Array.isArray(lesson.cards)) {
            for (const card of lesson.cards) {
              if (card.type === "word" || card.type === "phrase" || card.type === "reading") {
                addToMap(card.urdu, card.roman, card.english);
              }
              if (card.items) { // contrast/match types
                card.items.forEach((item: any) => addToMap(item.urdu, item.roman, item.english || ""));
              }
            }
          }
          // Variant 3: vocabulary & phrases
          if ('vocabulary' in lesson && Array.isArray(lesson.vocabulary)) {
            lesson.vocabulary.forEach((v: any) => addToMap(v.urdu, v.roman, v.english));
          }
          if ('phrases' in lesson && Array.isArray(lesson.phrases)) {
            lesson.phrases.forEach((p: any) => addToMap(p.urdu, p.roman, p.english));
          }
          // Variant 4: screens
          if ('screens' in lesson && Array.isArray(lesson.screens)) {
            for (const screen of lesson.screens) {
              if (screen.type === "vocabulary") {
                addToMap(screen.urdu_text, screen.roman, screen.english_text);
              }
            }
          }
        }
      }
    }

    console.log(`Built word map with ${wordMap.size} entries.`);

    // Sets to track assets
    const audioAssets = new Set<string>();
    const imageAssets = new Set<string>();

    const registerAsset = (type: 'audio' | 'image', path: string) => {
      if (type === 'audio') audioAssets.add(path);
      if (type === 'image') imageAssets.add(path);
    };

    let unitOrder = 1;

    for (const stage of curriculumData.course.stages) {
      for (const unitJson of stage.units) {
        const unitTitle = getUnitTitle(unitJson);

        const unit = await db
          .insert(schema.units)
          .values({
            courseId: courseId,
            title: unitTitle,
            description: `Stage ${stage.id} - ${stage.name}`,
            order: unitOrder++,
          })
          .returning();

        const unitId = unit[0].id;
        let lessonOrder = 1;


        // Demo lesson removed to prevent interference with curriculum structure

        if (!unitJson.lessons || !Array.isArray(unitJson.lessons)) {
          console.log("Problematic Unit in Seeding Loop:", JSON.stringify(unitJson, null, 2));
          continue;
        }
        for (const lessonJson of unitJson.lessons as AnyLesson[]) {
          const lessonTitle = getLessonTitle(lessonJson);

          const lesson = await db
            .insert(schema.lessons)
            .values({
              unitId: unitId,
              title: lessonTitle,
              order: lessonOrder++,
            })
            .returning();

          const lessonId = lesson[0].id;
          let challengeOrder = 1;
          const challengesData: any[] = [];
          const optionsDataMap: { [key: number]: any[] } = {};

          // --- Content Extraction Logic ---

          // Strategy: Convert everything into a standard "Card" format for processing
          // Standard Card: { type: 'SELECT' | 'ASSIST', question: string, options: { text, correct, audio?, image? }[] }

          const processedCards: { type: "SELECT" | "ASSIST", question: string, options: any[] }[] = [];

          // 1. Handle 'cards' array (Variant 1 & 2)
          if ('cards' in lessonJson && Array.isArray(lessonJson.cards)) {
            const vocabulary = lessonJson.cards
              .filter((c: any) => c.type === "word" || c.type === "phrase" || c.type === "sentence")
              .map((c: any) => c.english);

            for (const card of lessonJson.cards) {
              if (card.type === "quiz") {
                processedCards.push({
                  type: "SELECT",
                  question: card.question,
                  options: card.options.map((opt: string) => ({
                    text: opt,
                    correct: opt === card.answer,
                    // Asset lookup happens later
                  }))
                });
              } else if (card.type === "word" || card.type === "phrase" || card.type === "sentence") {
                // Create ASSIST challenge for word, phrase, and sentence types
                const correctAnswer = card.english;
                const distractors = vocabulary
                  .filter((w: string) => w !== correctAnswer)
                  .sort(() => 0.5 - Math.random())
                  .slice(0, 2);

                while (distractors.length < 2) distractors.push("Thing"); // Fallback

                const allOptions = [correctAnswer, ...distractors].sort(() => 0.5 - Math.random());

                processedCards.push({
                  type: "ASSIST",
                  question: `What is "${card.urdu}"?`,
                  options: allOptions.map(opt => ({
                    text: opt,
                    correct: opt === correctAnswer
                  }))
                });
              }
              // Skip 'exercise' type cards for now as they require different handling
            }
          }

          // 2. Handle 'vocabulary' & 'phrases' (Variant 3)
          if ('vocabulary' in lessonJson && Array.isArray(lessonJson.vocabulary)) {
            const vocabList = lessonJson.vocabulary;
            const englishList = vocabList.map((v: any) => v.english);

            for (const v of vocabList) {
              const distractors = englishList
                .filter((e: string) => e !== v.english)
                .sort(() => 0.5 - Math.random())
                .slice(0, 2);
              while (distractors.length < 2) distractors.push("Other");

              const allOptions = [v.english, ...distractors].sort(() => 0.5 - Math.random());

              processedCards.push({
                type: "ASSIST",
                question: `What is "${v.urdu}"?`,
                options: allOptions.map(opt => ({
                  text: opt,
                  correct: opt === v.english
                }))
              });
            }
          }

          // 3. Handle 'screens' (Variant 4)
          if ('screens' in lessonJson && Array.isArray(lessonJson.screens)) {
            for (const screen of lessonJson.screens) {
              if (screen.type === "multiple_choice") {
                processedCards.push({
                  type: "SELECT",
                  question: screen.question,
                  options: screen.options.map((o: any) => ({
                    text: o.text,
                    correct: o.correct
                  }))
                });
              } else if (screen.type === "vocabulary") {
                // Treat as ASSIST
                processedCards.push({
                  type: "ASSIST",
                  question: `What is "${screen.urdu_text}"?`,
                  options: [
                    { text: screen.english_text, correct: true },
                    { text: "Something else", correct: false }, // Simplified distractor for now
                    { text: "Unknown", correct: false }
                  ].sort(() => 0.5 - Math.random())
                });
              }
            }
          }

          // --- Process Generated Cards ---
          for (const card of processedCards) {
            challengesData.push({
              lessonId: lessonId,
              type: card.type,
              question: card.question,
              order: challengeOrder++,
            });

            const challengeIndex = challengesData.length - 1;
            optionsDataMap[challengeIndex] = [];

            for (const opt of card.options) {
              // Asset Generation Logic
              let audioSrc = null;
              let imageSrc = null;

              // Try to find metadata for the text (either Urdu or English)
              // If text is Urdu, look it up directly.
              // If text is English, we might need to reverse lookup or just use the English text for image.

              // Case 1: Option is Urdu (e.g. Quiz answers)
              let meta = wordMap.get(normalize(opt.text));

              // Case 2: Option is English (e.g. Assist answers)
              if (!meta) {
                // Try reverse lookup by English
                const englishMeta = englishMap.get(opt.text.trim().toLowerCase());
                if (englishMeta) {
                  meta = { roman: englishMeta.roman, english: opt.text };
                }
              }

              if (meta) {
                // Found metadata
                const safeRoman = meta.roman.toLowerCase().replace(/[^a-z0-9]/g, "_").replace(/_+/g, "_");
                const safeEnglish = meta.english.toLowerCase().replace(/ /g, "_").replace(/[^a-z0-9_]/g, "");

                audioSrc = `/sound/${safeRoman}.mp3`;
                imageSrc = `/${safeEnglish}.svg`;
              } else {
                // Assume English text for image generation
                const safeName = opt.text.toLowerCase().replace(/ /g, "_").replace(/[^a-z0-9_]/g, "");
                imageSrc = `/ ${safeName}.svg`;
                // No audio for English options usually, or we'd need a TTS
              }

              if (audioSrc) registerAsset('audio', audioSrc);
              if (imageSrc) registerAsset('image', imageSrc);

              optionsDataMap[challengeIndex].push({
                text: opt.text,
                correct: opt.correct,
                audioSrc: audioSrc,
                imageSrc: imageSrc,
              });
            }
          }

          // Batch Insert Challenges & Options
          if (challengesData.length > 0) {
            const insertedChallenges = await db
              .insert(schema.challenges)
              .values(challengesData)
              .returning();

            const allOptionsToInsert: any[] = [];

            insertedChallenges.forEach((challenge, index) => {
              const options = optionsDataMap[index];
              if (options) {
                options.forEach(opt => {
                  allOptionsToInsert.push({
                    ...opt,
                    challengeId: challenge.id
                  });
                });
              }
            });

            if (allOptionsToInsert.length > 0) {
              const chunkSize = 1000;
              for (let j = 0; j < allOptionsToInsert.length; j += chunkSize) {
                await db.insert(schema.challengeOptions)
                  .values(allOptionsToInsert.slice(j, j + chunkSize));
              }
            }
          }
        }
      }
    }

    console.log("Database seeded successfully with Urdu curriculum");

    console.log("\n--- ASSET REPORT ---");
    console.log("Required Audio Files:");
    Array.from(audioAssets).sort().forEach(a => console.log(a));
    console.log("\nRequired Image Files:");
    Array.from(imageAssets).sort().forEach(i => console.log(i));
    console.log("--------------------\n");

  } catch (error) {
    console.error(error);
    throw new Error("Failed to seed database");
  }
};

main();
