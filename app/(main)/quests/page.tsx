import { Check } from "lucide-react";
import Image from "next/image";
import { redirect } from "next/navigation";

import { FeedWrapper } from "@/components/feed-wrapper";
import { Promo } from "@/components/promo";
import { StickyWrapper } from "@/components/sticky-wrapper";
import { Progress } from "@/components/ui/progress";
import { UserProgress } from "@/components/user-progress";
import { QUESTS } from "@/constants";
import { getUserProgress, getUserSubscription } from "@/db/queries";

const QuestsPage = async () => {
  const userProgressData = getUserProgress();
  const userSubscriptionData = getUserSubscription();

  const [userProgress, userSubscription] = await Promise.all([
    userProgressData,
    userSubscriptionData,
  ]);

  if (!userProgress || !userProgress.activeCourse) redirect("/courses");

  const isPro = !!userSubscription?.isActive;

  return (
    <div className="flex flex-row-reverse gap-[48px] px-6">
      <StickyWrapper>
        <UserProgress
          activeCourse={userProgress.activeCourse}
          hearts={userProgress.hearts}
          points={userProgress.points}
          hasActiveSubscription={isPro}
        />
        {!isPro && <Promo />}
      </StickyWrapper>

      <FeedWrapper>
        <div className="flex w-full flex-col items-center">
          <Image src="/quests.svg" alt="Quests" height={90} width={90} />

          <h1 className="my-6 text-center text-2xl font-bold text-neutral-800">
            Quests
          </h1>
          <p className="mb-6 text-center text-lg text-muted-foreground">
            Complete quests by earning points.
          </p>

          <ul className="w-full">
            {QUESTS.map((quest) => {
              const progress = Math.min(
                (userProgress.points / quest.value) * 100,
                100
              );
              const done = progress >= 100;

              return (
                <li
                  className="flex w-full items-center gap-x-4 border-t-2 p-4"
                  key={quest.title}
                >
                  <Image
                    src="/points.svg"
                    alt=""
                    width={48}
                    height={48}
                    className={done ? "" : "opacity-90"}
                  />

                  <div className="flex w-full flex-col gap-y-2">
                    <div className="flex items-center justify-between gap-x-2">
                      <p className="text-lg font-extrabold text-neutral-700 sm:text-xl">
                        {quest.title}
                      </p>
                      {done ? (
                        <span className="flex items-center gap-x-1 text-sm font-extrabold text-green-500">
                          <Check className="h-4 w-4 stroke-[3]" /> Done
                        </span>
                      ) : (
                        <span className="text-sm font-bold text-neutral-400">
                          {userProgress.points}/{quest.value}
                        </span>
                      )}
                    </div>

                    <Progress value={progress} className="h-3" />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </FeedWrapper>
    </div>
  );
};

export default QuestsPage;
