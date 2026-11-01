import type { Metadata } from "next";

export const siteConfig: Metadata = {
  title: "Bolo",
  description:
    "Learn to read, speak and understand Urdu with bite-sized lessons, quizzes and progress tracking.",
  keywords: [
    "urdu",
    "learn urdu",
    "urdu lessons",
    "urdu alphabet",
    "language learning",
    "bolo",
  ] as Array<string>,
} as const;
