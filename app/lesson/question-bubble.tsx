import { useEffect } from "react";

import { Volume2 } from "lucide-react";
import Image from "next/image";
import { useAudio } from "react-use";

type QuestionBubbleProps = {
  question: string;
  hint?: string | null;
  audioSrc?: string | null;
};

export const QuestionBubble = ({
  question,
  hint,
  audioSrc,
}: QuestionBubbleProps) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [audio, _, controls] = useAudio({ src: audioSrc ?? "" });

  // Play the prompt once when it appears, like a tutor reading it aloud.
  useEffect(() => {
    if (audioSrc) void controls.play()?.catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioSrc]);

  return (
    <div className="mb-6 flex items-center gap-x-4">
      <Image
        src="/mascot.svg"
        alt="Mascot"
        height={60}
        width={60}
        className="hidden lg:block"
      />
      <Image
        src="/mascot.svg"
        alt="Mascot"
        height={40}
        width={40}
        className="block lg:hidden"
      />

      <div className="relative flex items-center gap-x-3 rounded-xl border-2 px-4 py-2">
        {audioSrc && audio}
        {audioSrc && (
          <button
            type="button"
            onClick={() => void controls.play()}
            aria-label="Play audio"
            className="text-sky-500 transition hover:opacity-75"
          >
            <Volume2 className="h-6 w-6" />
          </button>
        )}

        <div>
          <p dir="auto" lang="ur" className="text-xl leading-loose lg:text-2xl">
            {question}
          </p>
          {hint && (
            <p className="text-xs text-neutral-400 lg:text-sm">{hint}</p>
          )}
        </div>

        <div
          className="absolute -left-3 top-1/2 h-0 w-0 -translate-y-1/2 rotate-90 transform border-x-8 border-t-8 border-x-transparent rtl:-right-3 rtl:left-auto rtl:rotate-[270deg]"
          aria-hidden
        />
      </div>
    </div>
  );
};
