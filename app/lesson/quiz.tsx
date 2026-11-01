"use client";

import { useState, useTransition } from "react";

import Image from "next/image";
import { useRouter } from "next/navigation";
import Confetti from "react-confetti";
import { useAudio, useWindowSize, useMount } from "react-use";
import { toast } from "sonner";

import { upsertChallengeProgress } from "@/actions/challenge-progress";
import { reduceHearts } from "@/actions/user-progress";
import { MAX_HEARTS } from "@/constants";
import { challengeOptions, challenges, userSubscription } from "@/db/schema";
import { useHeartsModal } from "@/store/use-hearts-modal";
import { usePracticeModal } from "@/store/use-practice-modal";

import { Challenge } from "./challenge";
import { Footer } from "./footer";
import { Header } from "./header";
import { LearnCard } from "./learn-card";
import { MatchPairs } from "./match-pairs";
import { QuestionBubble } from "./question-bubble";
import { ResultCard } from "./result-card";
import { WordBank, wordBankAnswer } from "./word-bank";

type QuizProps = {
  initialPercentage: number;
  initialHearts: number;
  initialLessonId: number;
  initialLessonChallenges: (typeof challenges.$inferSelect & {
    completed: boolean;
    challengeOptions: (typeof challengeOptions.$inferSelect)[];
  })[];
  userSubscription:
    | (typeof userSubscription.$inferSelect & {
        isActive: boolean;
      })
    | null;
};

export const Quiz = ({
  initialPercentage,
  initialHearts,
  initialLessonId,
  initialLessonChallenges,
  userSubscription,
}: QuizProps) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [correctAudio, _c, correctControls] = useAudio({ src: "/correct.wav" });
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [incorrectAudio, _i, incorrectControls] = useAudio({
    src: "/incorrect.wav",
  });
  const [finishAudio] = useAudio({
    src: "/finish.mp3",
    autoPlay: true,
  });
  const { width, height } = useWindowSize();

  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const { open: openHeartsModal } = useHeartsModal();
  const { open: openPracticeModal } = usePracticeModal();

  useMount(() => {
    if (initialPercentage === 100) openPracticeModal();
  });

  const [lessonId] = useState(initialLessonId);
  const [hearts, setHearts] = useState(initialHearts);
  const [percentage, setPercentage] = useState(() => {
    return initialPercentage === 100 ? 0 : initialPercentage;
  });
  const [challenges] = useState(initialLessonChallenges);
  // Challenges already counted towards the progress bar this session, so
  // going back and answering one again doesn't push it past 100%.
  const [countedIds, setCountedIds] = useState<Set<number>>(
    () =>
      new Set(
        initialPercentage === 100
          ? []
          : initialLessonChallenges.filter((c) => c.completed).map((c) => c.id)
      )
  );
  const [activeIndex, setActiveIndex] = useState(() => {
    const uncompletedIndex = challenges.findIndex(
      (challenge) => !challenge.completed
    );

    return uncompletedIndex === -1 ? 0 : uncompletedIndex;
  });

  const [selectedOption, setSelectedOption] = useState<number>();
  const [builtWords, setBuiltWords] = useState<number[]>([]); // WORD_BANK
  const [allMatched, setAllMatched] = useState(false); // MATCH
  const [status, setStatus] = useState<"none" | "wrong" | "correct">("none");

  const challenge = challenges[activeIndex];
  const options = challenge?.challengeOptions ?? [];

  // Whether the learner has given an answer that can be checked
  const hasAnswer =
    challenge?.type === "LEARN"
      ? true
      : challenge?.type === "WORD_BANK"
        ? builtWords.length > 0
        : challenge?.type === "MATCH"
          ? allMatched
          : !!selectedOption;

  const resetAnswer = () => {
    setSelectedOption(undefined);
    setBuiltWords([]);
    setAllMatched(false);
  };

  const isAnswerCorrect = () => {
    if (challenge.type === "MATCH") return allMatched;
    if (challenge.type === "WORD_BANK") {
      const answer = builtWords.map(
        (id) => options.find((option) => option.id === id)?.text
      );
      return answer.join(" ") === wordBankAnswer(options).join(" ");
    }
    return options.find((option) => option.correct)?.id === selectedOption;
  };

  const onNext = () => {
    setActiveIndex((current) => current + 1);
  };

  const onBack = () => {
    if (activeIndex === 0) return; // Can't go back from first question
    setActiveIndex((current) => current - 1);
    setStatus("none");
    resetAnswer();
  };

  const onSelect = (id: number) => {
    if (status !== "none") return;

    setSelectedOption(id);
  };

  const onContinue = () => {
    if (!hasAnswer) return;

    if (status === "wrong") {
      setStatus("none");
      resetAnswer();
      return;
    }

    if (status === "correct") {
      onNext();
      setStatus("none");
      resetAnswer();
      return;
    }

    const countProgress = () => {
      if (countedIds.has(challenge.id)) return;
      setCountedIds((prev) => new Set(prev).add(challenge.id));
      setPercentage((prev) => Math.min(prev + 100 / challenges.length, 100));
    };

    // Teaching cards: record that it was seen and move straight on.
    if (challenge.type === "LEARN") {
      startTransition(() => {
        upsertChallengeProgress(challenge.id)
          .then(() => {
            countProgress();
            onNext();
            resetAnswer();
          })
          .catch(() => toast.error("Something went wrong. Please try again."));
      });
      return;
    }

    if (isAnswerCorrect()) {
      startTransition(() => {
        upsertChallengeProgress(challenge.id)
          .then((response) => {
            if (response?.error === "hearts") {
              openHeartsModal();
              return;
            }

            void correctControls.play();
            setStatus("correct");
            countProgress();

            // This is a practice
            if (initialPercentage === 100) {
              setHearts((prev) => Math.min(prev + 1, MAX_HEARTS));
            }
          })
          .catch(() => toast.error("Something went wrong. Please try again."));
      });
    } else {
      startTransition(() => {
        reduceHearts(challenge.id)
          .then((response) => {
            if (response?.error === "hearts") {
              openHeartsModal();
              return;
            }

            void incorrectControls.play();
            setStatus("wrong");

            if (!response?.error) setHearts((prev) => Math.max(prev - 1, 0));
          })
          .catch(() => toast.error("Something went wrong. Please try again."));
      });
    }
  };

  if (!challenge) {
    return (
      <>
        {finishAudio}
        <Confetti
          recycle={false}
          numberOfPieces={500}
          tweenDuration={10_000}
          width={width}
          height={height}
        />
        <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-y-4 overflow-y-auto px-4 text-center lg:gap-y-8">
          <Image
            src="/finish.svg"
            alt="Finish"
            className="hidden lg:block"
            height={100}
            width={100}
          />

          <Image
            src="/finish.svg"
            alt="Finish"
            className="block lg:hidden"
            height={100}
            width={100}
          />

          <h1 className="text-lg font-bold text-neutral-700 lg:text-3xl">
            Great job! <br /> You&apos;ve completed the lesson.
          </h1>

          <div className="flex w-full items-center gap-x-4">
            <ResultCard
              variant="points"
              value={challenges.filter((c) => c.type !== "LEARN").length * 10}
            />
            <ResultCard
              variant="hearts"
              value={userSubscription?.isActive ? Infinity : hearts}
            />
          </div>
        </div>

        <Footer
          lessonId={lessonId}
          status="completed"
          onCheck={() => router.push("/learn")}
        />
      </>
    );
  }

  const title =
    challenge.type === "LEARN"
      ? learnTitle(challenge.question)
      : challenge.type === "ASSIST"
        ? learnTitle(challenge.question) === "New letter"
          ? "What sound does this letter make?"
          : "What does this mean?"
        : challenge.type === "WORD_BANK"
          ? /[\u0600-\u06FF]/.test(options[0]?.text ?? "")
            ? "Write this in Urdu"
            : "Say this in Urdu"
          : challenge.question;

  return (
    <>
      {incorrectAudio}
      {correctAudio}
      <Header
        hearts={hearts}
        percentage={percentage}
        hasActiveSubscription={!!userSubscription?.isActive}
        onBack={onBack}
        showBack={activeIndex > 0}
      />

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center py-6">
          <div className="flex w-full max-w-[600px] flex-col gap-y-6 px-4 sm:px-6 lg:min-h-[350px] lg:gap-y-10 lg:px-0">
            <h1
              dir="auto"
              className="text-center text-lg font-bold text-neutral-700 lg:text-start lg:text-3xl"
            >
              {title}
            </h1>

            <div className="mb-8">
              {challenge.type === "ASSIST" && (
                <QuestionBubble
                  question={challenge.question}
                  hint={challenge.hint}
                  audioSrc={challenge.audioSrc}
                />
              )}

              {/* No audio here - hearing the Urdu would give the answer away */}
              {challenge.type === "WORD_BANK" && (
                <QuestionBubble question={challenge.question} />
              )}

              {challenge.type === "LEARN" ? (
                <LearnCard challenge={challenge} meaning={options[0]} />
              ) : challenge.type === "WORD_BANK" ? (
                <WordBank
                  key={challenge.id}
                  challengeId={challenge.id}
                  options={options}
                  selected={builtWords}
                  onChange={setBuiltWords}
                  status={status}
                  disabled={pending}
                />
              ) : challenge.type === "MATCH" ? (
                <MatchPairs
                  key={challenge.id}
                  challengeId={challenge.id}
                  options={options}
                  onComplete={() => setAllMatched(true)}
                  disabled={pending || status !== "none"}
                />
              ) : (
                <Challenge
                  options={options}
                  onSelect={onSelect}
                  status={status}
                  selectedOption={selectedOption}
                  disabled={pending}
                  type={challenge.type}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      <Footer
        disabled={pending || !hasAnswer}
        status={status}
        onCheck={onContinue}
        checkLabel={challenge.type === "LEARN" ? "Continue" : undefined}
        solution={
          challenge.type === "WORD_BANK" && status === "wrong"
            ? wordBankAnswer(options).join(" ")
            : undefined
        }
      />
    </>
  );
};

const learnTitle = (text: string) => {
  // A single Urdu letter, ignoring vowel marks and joiners
  if (text.replace(/\s|\u0640|\u06BE|\u0670|[\u064B-\u0652]/g, "").length === 1)
    return "New letter";
  return text.trim().includes(" ") ? "New phrase" : "New word";
};
