import { neon } from "@neondatabase/serverless";
import "dotenv/config";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "../db/schema";
import fs from "fs";
import path from "path";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

// Type definitions for the JSON structure
type Card = {
  id: string;
  type: "word" | "sentence" | "quiz";
  urdu?: string;
  roman?: string;
  english?: string;
  question?: string;
  options?: string[];
  answer?: string;
};

type Lesson = {
  id: string;
  title: string;
  cards: Card[];
};

type Unit = {
  id: string;
  title: string;
  lessons: Lesson[];
};

type Stage = {
  id: number;
  name: string;
  level: string;
  units: Unit[];
};

type Curriculum = {
  course: {
    language: string;
    stages: Stage[];
  };
};

const main = async () => {
  try {
    console.log("Seeding database");

    // Delete all existing data sequentially to avoid deadlocks
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
    // Trying both filenames just in case
    let curriculumData: Curriculum;
    try {
      const data = fs.readFileSync(path.join(process.cwd(), "urdu_curriculum.json"), "utf8");
      curriculumData = JSON.parse(data);
    } catch (e) {
      console.log("Could not find urdu_curriculum.json, trying urdu_curriculum.json.json");
      const data = fs.readFileSync(path.join(process.cwd(), "urdu_curriculum.json.json"), "utf8");
      curriculumData = JSON.parse(data);
    }

    let unitOrder = 1;
    // Pre-calculate IDs to maintain relationships without waiting for DB
    // Actually, we need DB IDs for foreign keys. 
    // Batch inserting with foreign keys is tricky if we need the IDs back.
    // Drizzle's `returning()` works with batch inserts but mapping them back to children is complex.
    // Strategy: Insert Units in batch, get IDs, then Lessons, etc.
    // But we have a hierarchy.
    // Optimized approach:
    // 1. Insert all Units for the course.
    // 2. Insert all Lessons for all Units.
    // 3. Insert all Challenges for all Lessons.
    // 4. Insert all Options for all Challenges.

    // To do this, we need to generate IDs client-side or handle mapping.
    // Since we can't easily generate serial IDs client-side without collision risk (unless we reset sequence),
    // we will stick to per-Unit or per-Lesson batching which is a middle ground.
    // Or just parallelize?

    // Let's try to batch at the Lesson level.
    // For each Unit, insert all Lessons in one go.
    // For each Lesson, insert all Challenges in one go.
    // For each Challenge, insert all Options in one go.

    for (const stage of curriculumData.course.stages) {
      for (const unitJson of stage.units) {
        // Insert Unit
        const unit = await db
          .insert(schema.units)
          .values({
            courseId: courseId,
            title: unitJson.title,
            description: `Stage ${stage.id} - ${stage.name}`,
            order: unitOrder++,
          })
          .returning();

        const unitId = unit[0].id;
        let lessonOrder = 1;

        // INJECTED: "Nouns" Lesson from Bolo_WIP (with Assets)
        // Only inject for the very first unit of the first stage
        if (stage.id === 1 && unitOrder === 2) { // unitOrder was incremented, so 2 means the first unit
          const nounsLesson = await db
            .insert(schema.lessons)
            .values({
              unitId: unitId,
              title: "Basics: Nouns (Demo)",
              order: lessonOrder++,
            })
            .returning();

          const nounsLessonId = nounsLesson[0].id;

          // Challenge 1: Select Man
          const c1 = await db.insert(schema.challenges).values({
            lessonId: nounsLessonId,
            type: "SELECT",
            order: 1,
            question: 'Which one of these is "a man"?',
          }).returning();

          await db.insert(schema.challengeOptions).values([
            { challengeId: c1[0].id, imageSrc: "/man.svg", correct: true, text: "aadmi", audioSrc: "/sound/pk_man.mp3" },
            { challengeId: c1[0].id, imageSrc: "/woman.svg", correct: false, text: "aurat", audioSrc: "/sound/pk_woman.mp3" },
            { challengeId: c1[0].id, imageSrc: "/boy.svg", correct: false, text: "larka", audioSrc: "/sound/pk_boy.mp3" },
          ]);

          // Challenge 2: Assist Man
          const c2 = await db.insert(schema.challenges).values({
            lessonId: nounsLessonId,
            type: "ASSIST",
            order: 2,
            question: '"a man"',
          }).returning();

          await db.insert(schema.challengeOptions).values([
            { challengeId: c2[0].id, correct: true, text: "aadmi", audioSrc: "/sound/pk_man.mp3" },
            { challengeId: c2[0].id, correct: false, text: "aurat", audioSrc: "/sound/pk_woman.mp3" },
            { challengeId: c2[0].id, correct: false, text: "larka", audioSrc: "/sound/pk_boy.mp3" },
          ]);

          // Challenge 3: Select Woman
          const c3 = await db.insert(schema.challenges).values({
            lessonId: nounsLessonId,
            type: "SELECT",
            order: 3,
            question: 'Which one of these is "a woman"?',
          }).returning();

          await db.insert(schema.challengeOptions).values([
            { challengeId: c3[0].id, imageSrc: "/man.svg", correct: false, text: "aadmi", audioSrc: "/sound/pk_man.mp3" },
            { challengeId: c3[0].id, imageSrc: "/woman.svg", correct: true, text: "aurat", audioSrc: "/sound/pk_woman.mp3" },
            { challengeId: c3[0].id, imageSrc: "/boy.svg", correct: false, text: "larka", audioSrc: "/sound/pk_boy.mp3" },
          ]);
        }

        // Prepare Lessons
        const lessonsData = unitJson.lessons.map(l => ({
          unitId: unitId,
          title: l.title,
          order: lessonOrder++,
        }));

        if (lessonsData.length === 0) continue;

        const insertedLessons = await db
          .insert(schema.lessons)
          .values(lessonsData)
          .returning();

        // Map original lessons to inserted lessons to process challenges
        // We assume order is preserved or we match by title/order.
        // Since we insert in order, `insertedLessons` should match `unitJson.lessons`.

        for (let i = 0; i < insertedLessons.length; i++) {
          const lessonId = insertedLessons[i].id;
          const lessonJson = unitJson.lessons[i];
          let challengeOrder = 1;

          const lessonVocabulary = lessonJson.cards
            .filter((c) => c.type === "word" || c.type === "sentence")
            .map((c) => c.english!);

          const challengesData: any[] = [];
          const optionsDataMap: { [key: number]: any[] } = {}; // Map index in challengesData to options

          for (const card of lessonJson.cards) {
            if (card.type === "quiz") {
              challengesData.push({
                lessonId: lessonId,
                type: "SELECT",
                question: card.question!,
                order: challengeOrder++,
              });

              const challengeIndex = challengesData.length - 1;
              optionsDataMap[challengeIndex] = [];

              if (card.options && card.answer) {
                for (const optionText of card.options) {
                  optionsDataMap[challengeIndex].push({
                    text: optionText,
                    correct: optionText === card.answer,
                  });
                }
              }
            } else if (card.type === "word" || card.type === "sentence") {
              challengesData.push({
                lessonId: lessonId,
                type: "ASSIST",
                question: `What is "${card.urdu}"?`,
                order: challengeOrder++,
              });

              const challengeIndex = challengesData.length - 1;
              optionsDataMap[challengeIndex] = [];

              const correctAnswer = card.english!;
              const otherWords = lessonVocabulary.filter((w) => w !== correctAnswer);
              const distractors = otherWords.sort(() => 0.5 - Math.random()).slice(0, 2);

              if (distractors.length < 2) {
                if (!distractors.includes("House")) distractors.push("House");
                if (!distractors.includes("Book") && !distractors.includes(correctAnswer)) distractors.push("Book");
                while (distractors.length < 2) {
                  distractors.push("Thing");
                }
              }

              const allOptions = [correctAnswer, ...distractors].sort(() => 0.5 - Math.random());

              for (const optionText of allOptions) {
                optionsDataMap[challengeIndex].push({
                  text: optionText,
                  correct: optionText === correctAnswer,
                  audioSrc: null,
                });
              }
            }
          }

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
              // Batch insert options (chunks of 1000 to avoid limits)
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
  } catch (error) {
    console.error(error);
    throw new Error("Failed to seed database");
  }
};

main();
