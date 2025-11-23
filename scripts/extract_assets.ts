
import fs from "fs";
import path from "path";

type Card = {
    type: "word" | "sentence" | "quiz";
    urdu?: string;
    roman?: string;
    english?: string;
    question?: string;
    options?: string[];
    answer?: string;
};

type Lesson = {
    title: string;
    cards: Card[];
};

type Unit = {
    title: string;
    lessons: Lesson[];
};

type Stage = {
    units: Unit[];
};

type Curriculum = {
    course: {
        stages: Stage[];
    };
};

const main = () => {
    const data = fs.readFileSync(path.join(process.cwd(), "urdu_curriculum.json"), "utf8");
    const curriculum: Curriculum = JSON.parse(data);

    const images = new Set<string>();
    const audio = new Set<string>();

    curriculum.course.stages.forEach((stage) => {
        stage.units.forEach((unit) => {
            unit.lessons.forEach((lesson) => {
                lesson.cards.forEach((card) => {
                    if (card.type === "word") {
                        if (card.english) images.add(card.english.toLowerCase().replace(/ /g, "_") + ".svg");
                        if (card.roman) audio.add(card.roman.toLowerCase().replace(/ /g, "_") + ".mp3");
                    } else if (card.type === "sentence") {
                        if (card.roman) audio.add(card.roman.toLowerCase().replace(/[^a-z0-9]/g, "_").replace(/_+/g, "_") + ".mp3");
                    }
                });
            });
        });
    });

    console.log("### Required Images");
    Array.from(images).sort().forEach((img) => console.log(`- [ ] public/${img}`));

    console.log("\n### Required Audio");
    Array.from(audio).sort().forEach((aud) => console.log(`- [ ] public/sound/${aud}`));
};

main();
