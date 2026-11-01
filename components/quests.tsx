import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { QUESTS } from "@/constants";

type QuestsProps = { points: number };

export const Quests = ({ points }: QuestsProps) => {
  return (
    <div className="space-y-4 rounded-2xl border-2 p-4">
      <div className="flex w-full items-center justify-between space-y-2">
        <h3 className="text-lg font-bold">Quests</h3>

        <Link href="/quests">
          <Button size="sm" variant="primaryOutline">
            View all
          </Button>
        </Link>
      </div>

      <ul className="w-full space-y-4">
        {QUESTS.map((quest) => {
          const progress = Math.min((points / quest.value) * 100, 100);

          return (
            <li
              className="flex w-full items-center gap-x-3 pb-4"
              key={quest.title}
            >
              <Image src="/points.svg" alt="" width={40} height={40} />

              <div className="flex w-full flex-col gap-y-2">
                <p className="text-sm font-bold text-neutral-700">
                  {quest.title}
                  {progress >= 100 && (
                    <span className="ms-2 text-green-500">✓</span>
                  )}
                </p>

                <Progress value={progress} className="h-2" />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
