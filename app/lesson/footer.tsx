import { CheckCircle, XCircle } from "lucide-react";
import { useKey, useMedia } from "react-use";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type FooterProps = {
  onCheck: () => void;
  status: "correct" | "wrong" | "none" | "completed";
  disabled?: boolean;
  lessonId?: number;
  solution?: string; // shown when the learner gets it wrong
  checkLabel?: string; // replaces "Check", e.g. "Continue" on teaching cards
};

export const Footer = ({
  onCheck,
  status,
  disabled,
  lessonId,
  solution,
  checkLabel,
}: FooterProps) => {
  useKey("Enter", onCheck, {}, [onCheck]);
  const isMobile = useMedia("(max-width: 1024px)");

  return (
    <footer
      className={cn(
        "min-h-[96px] shrink-0 border-t-2 pb-[env(safe-area-inset-bottom)] lg:h-[140px]",
        status === "correct" && "border-transparent bg-green-100",
        status === "wrong" && "border-transparent bg-rose-100"
      )}
    >
      <div className="mx-auto flex h-full min-h-[96px] max-w-[1140px] items-center justify-between gap-x-4 px-4 py-4 sm:px-6 lg:px-10 lg:py-6">
        {status === "correct" && (
          <div className="flex items-center text-base font-bold text-green-500 lg:text-2xl">
            <CheckCircle className="me-4 h-6 w-6 lg:h-10 lg:w-10" />
            Nicely done!
          </div>
        )}

        {status === "wrong" && (
          <div className="flex items-center text-base font-bold text-rose-500 lg:text-2xl">
            <XCircle className="me-4 h-6 w-6 shrink-0 lg:h-10 lg:w-10" />
            <div>
              Try again.
              {solution && (
                <p className="text-sm font-normal lg:text-base">
                  Correct answer:{" "}
                  <span dir="auto" lang="ur" className="text-lg lg:text-xl">
                    {solution}
                  </span>
                </p>
              )}
            </div>
          </div>
        )}

        {status === "completed" && (
          <Button
            variant="default"
            size={isMobile ? "sm" : "lg"}
            onClick={() => (window.location.href = `/lesson/${lessonId}`)}
          >
            Practice again
          </Button>
        )}

        <Button
          disabled={disabled}
          aria-disabled={disabled}
          className="ms-auto"
          onClick={onCheck}
          size={isMobile ? "sm" : "lg"}
          variant={status === "wrong" ? "danger" : "secondary"}
        >
          {status === "none" && (checkLabel ?? "Check")}
          {status === "correct" && "Next"}
          {status === "wrong" && "Retry"}
          {status === "completed" && "Continue"}
        </Button>
      </div>
    </footer>
  );
};
