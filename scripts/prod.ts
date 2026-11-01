import { neon } from "@neondatabase/serverless";
import "dotenv/config";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "../db/schema";

import { createBuilder } from "./curriculum/build";
import { loadCurriculum } from "./curriculum/load";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

const main = async () => {
  try {
    console.log("Seeding database");

    const units = loadCurriculum();
    const builder = createBuilder(units);

    // Delete all existing data (this also resets every learner's progress)
    await db.delete(schema.challengeProgress);
    await db.delete(schema.userProgress);
    await db.delete(schema.userSubscription);
    await db.delete(schema.challengeOptions);
    await db.delete(schema.challenges);
    await db.delete(schema.lessons);
    await db.delete(schema.units);
    await db.delete(schema.courses);

    const [course] = await db
      .insert(schema.courses)
      .values({ title: "Urdu", imageSrc: "/pk.svg" })
      .returning();

    let lessonCount = 0;
    let challengeCount = 0;
    const emptyLessons: string[] = [];

    for (const [unitIndex, unitJson] of Array.from(units.entries())) {
      const [unit] = await db
        .insert(schema.units)
        .values({
          courseId: course.id,
          title: unitJson.title,
          description: unitJson.description,
          order: unitIndex + 1,
        })
        .returning();

      let lessonOrder = 1;

      for (const lessonJson of unitJson.lessons) {
        const built = builder.buildLesson(unitJson, lessonJson);

        // A lesson with no questions can never be completed, so leave it out.
        if (!built.length) {
          emptyLessons.push(`${unitJson.title} › ${lessonJson.title}`);
          continue;
        }

        const [lesson] = await db
          .insert(schema.lessons)
          .values({
            unitId: unit.id,
            title: lessonJson.title,
            order: lessonOrder++,
          })
          .returning();

        const insertedChallenges = await db
          .insert(schema.challenges)
          .values(
            built.map((c, i) => ({
              lessonId: lesson.id,
              type: c.type,
              question: c.question,
              hint: c.hint,
              audioSrc: c.audioSrc,
              order: i + 1,
            }))
          )
          .returning();

        await db.insert(schema.challengeOptions).values(
          insertedChallenges.flatMap((challenge, i) =>
            built[i].options.map((opt) => ({
              ...opt,
              challengeId: challenge.id,
            }))
          )
        );

        lessonCount++;
        challengeCount += built.length;
      }
    }

    console.log(
      `Seeded ${units.length} units, ${lessonCount} lessons, ${challengeCount} challenges.`
    );

    if (emptyLessons.length) {
      console.log("\nSkipped lessons with no usable content:");
      emptyLessons.forEach((l) => console.log(`  - ${l}`));
    }

    const audio = builder.missingAudio();
    const images = builder.missingImages();
    console.log(
      `\n${audio.length} audio files and ${images.length} images are still missing.` +
        `\nRun "npm run assets:report" to write the to-do lists into docs/.`
    );
  } catch (error) {
    console.error(error);
    throw new Error("Failed to seed database");
  }
};

void main();
