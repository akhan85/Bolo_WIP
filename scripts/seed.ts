import "dotenv/config";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";

import * as schema from "../db/schema";

const sql = neon(process.env.DATABASE_URL!);

const db = drizzle(sql, { schema });

const main = async () => {
    try {
        console.log("Seeding database");

        await db.delete(schema.courses);
        await db.delete(schema.userProgress);
        await db.delete(schema.units);
        await db.delete(schema.lessons);
        await db.delete(schema.challenges);
        await db.delete(schema.challengeOptions);
        await db.delete(schema.challengeProgress);

        await db.insert(schema.courses).values([
            {
                id: 1,
                title: "Urdu",
                imageSrc: "/pk.svg",
            },
        ]);

        await db.insert(schema.units).values([
            {
                id: 1,
                courseId: 1, //Urdu
                title: "Unit 1",
                description: "Learn the basics of Urdu",
                imageSrc:"/pk.svg",
                order: 1,
            }
        ]);

        await db.insert(schema.lessons).values([
            {
                id: 1,
                unitId: 1,
                order: 1,
                title: "Nouns",
            },
            {
                id: 2,
                unitId: 1,
                order: 2,
                title: "Verbs",
            },
            {
                id: 3,
                unitId: 1,
                order: 3,
                title: "Verbs",
            },
            {
                id: 4,
                unitId: 1,
                order: 4,
                title: "Verbs",
            },
            {
                id: 5,
                unitId: 1,
                order: 5,
                title: "Verbs",
            },
        ]);

        await db.insert(schema.challenges).values([
            {
                id: 1,
                lessonId: 1, //Nouns
                type: "SELECT",
                order: 1,
                question: 'Which one of these is "a man"?',
            },
            {
                id: 2,
                lessonId: 1, //Nouns
                type: "ASSIST",
                order: 2,
                question: '"a man"',
            },
            {
                id: 3,
                lessonId: 1, //Nouns
                type: "SELECT",
                order: 3,
                question: 'Which one of these is "a woman"',
            },
        ]);

        //First Challenge
        await db.insert(schema.challengeOptions).values([
            {
                challengeId: 1, //which one of these is "a man"?
                imageSrc: "/man.svg",
                correct: true,
                text: "aadmi",
                audioSrc: "/sound/pk_man.mp3",
            },
            {
                challengeId: 1, //which one of these is "a woman"?
                imageSrc: "/woman.svg",
                correct: false,
                text: "aurat",
                audioSrc: "/sound/pk_woman.mp3",                
            },
            {
                challengeId: 1, //which one of these is "a boy"?
                imageSrc: "/boy.svg",
                correct: false,
                text: "larka",
                audioSrc: "/sound/pk_boy.mp3",                
            },
        ]);

        //Second Challenge

        await db.insert(schema.challengeOptions).values([
            {
                challengeId: 2, //"a man"
                correct: true,
                text: "aadmi",
                audioSrc: "/sound/pk_man.mp3",                
            },
            {
                challengeId: 2, //which one of these is "a woman"?
                correct: false,
                text: "aurat",
                audioSrc: "/sound/pk_woman.mp3",                
            },
            {
                challengeId: 2, //which one of these is "a man"?
                correct: false,
                text: "larka",
                audioSrc: "/sound/pk_boy.mp3",
            },
        ]);

        //Third Challenge

        await db.insert(schema.challengeOptions).values([
            {
                challengeId: 3, //which one of these is "a man"?
                imageSrc: "/man.svg",
                correct: false,
                text: "aadmi",
                audioSrc: "/sound/pk_man.mp3",
            },
            {
                challengeId: 3, //which one of these is "a woman"?
                imageSrc: "/woman.svg",
                correct: true,
                text: "aurat",
                audioSrc: "/sound/pk_woman.mp3",                
            },
            {
                challengeId: 3, //which one of these is "a man"?
                imageSrc: "/boy.svg",
                correct: false,
                text: "larka",
                audioSrc: "/sound/pk_boy.mp3",                
            },
        ]);

        await db.insert(schema.challenges).values([
            {
                id: 4,
                lessonId: 2, //Verbs
                type: "SELECT",
                order: 1,
                question: 'Which one of these is "a man"?',
            },
            {
                id: 5,
                lessonId: 2, //Verbs
                type: "ASSIST",
                order: 2,
                question: '"a man"',
            },
            {
                id: 6,
                lessonId: 2, //Verbs
                type: "SELECT",
                order: 3,
                question: 'Which one of these is "a woman"',
            },
        ]);

        console.log("Seeding finished");
    } catch(error) {
        console.error(error);
        throw new Error("Failed to seed the database");
    }
};

main();