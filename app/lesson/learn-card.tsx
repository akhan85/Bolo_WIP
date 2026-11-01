import { useEffect } from "react";

import { Volume2 } from "lucide-react";
import Image from "next/image";
import { useAudio } from "react-use";

import { challengeOptions, challenges } from "@/db/schema";

type LearnCardProps = {
  challenge: typeof challenges.$inferSelect;
  meaning?: typeof challengeOptions.$inferSelect;
};

// Introduces a new item before it is ever tested: picture, text, pronunciation,
// meaning and sound. There's nothing to get wrong - the learner just continues.
export const LearnCard = ({ challenge, meaning }: LearnCardProps) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [audio, _, controls] = useAudio({ src: challenge.audioSrc ?? "" });

  useEffect(() => {
    if (challenge.audioSrc) void controls.play()?.catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [challenge.audioSrc]);

  return (
    <div className="flex flex-col items-center gap-y-4 rounded-2xl border-2 border-b-4 px-6 py-8 text-center">
      {challenge.audioSrc && audio}

      {meaning?.imageSrc && (
        <div className="relative h-[100px] w-[100px] lg:h-[140px] lg:w-[140px]">
          <Image src={meaning.imageSrc} fill alt={meaning.text} />
        </div>
      )}

      <div className="flex items-center gap-x-3">
        {challenge.audioSrc && (
          <button
            type="button"
            onClick={() => void controls.play()}
            aria-label="Play audio"
            className="text-sky-500 transition hover:opacity-75"
          >
            <Volume2 className="h-7 w-7" />
          </button>
        )}
        <p
          dir="auto"
          className="text-4xl font-bold leading-loose text-neutral-700 lg:text-5xl"
        >
          {challenge.question}
        </p>
      </div>

      {challenge.hint && (
        <p dir="auto" className="text-lg text-neutral-400 lg:text-xl">
          {challenge.hint}
        </p>
      )}

      {meaning?.text && (
        <p className="text-base text-neutral-600 lg:text-lg">
          means <span className="font-bold">{meaning.text}</span>
        </p>
      )}
    </div>
  );
};
