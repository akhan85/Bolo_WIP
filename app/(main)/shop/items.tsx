"use client";

import { useTransition } from "react";

import Image from "next/image";
import { toast } from "sonner";

import { refillHearts } from "@/actions/user-progress";
import { createStripeUrl } from "@/actions/user-subscription";
import { Button } from "@/components/ui/button";
import { MAX_HEARTS, POINTS_TO_REFILL } from "@/constants";

type ItemsProps = {
  hearts: number;
  points: number;
  hasActiveSubscription: boolean;
  isGifted?: boolean; // Pro given with `npm run pro -- grant`
};

export const Items = ({
  hearts,
  points,
  hasActiveSubscription,
  isGifted,
}: ItemsProps) => {
  const [pending, startTransition] = useTransition();

  const onRefillHearts = () => {
    if (pending || hearts === MAX_HEARTS || points < POINTS_TO_REFILL) return;

    startTransition(() => {
      refillHearts().catch(() => toast.error("Something went wrong."));
    });
  };

  const onUpgrade = () => {
    if (pending || isGifted) return;

    startTransition(() => {
      const toastId = toast.loading("Redirecting to checkout...", {
        dismissible: true,
      });

      createStripeUrl()
        .then((response) => {
          if (response.data) {
            window.location.assign(response.data);
            return;
          }

          toast.error(response.error ?? "Something went wrong.", {
            id: toastId,
          });
        })
        .catch(() => {
          toast.error("Something went wrong.", { id: toastId });
        });
    });
  };

  return (
    <ul className="w-full">
      <div className="flex w-full items-center gap-x-4 border-t-2 p-4">
        <Image src="/heart.svg" alt="" height={52} width={52} />

        <div className="flex-1">
          <p className="text-base font-extrabold text-neutral-700 lg:text-xl">
            Refill hearts
          </p>
          <p className="text-sm text-neutral-500">
            Get all {MAX_HEARTS} hearts back for {POINTS_TO_REFILL} XP
          </p>
        </div>

        <Button
          onClick={onRefillHearts}
          disabled={
            pending || hearts === MAX_HEARTS || points < POINTS_TO_REFILL
          }
          aria-disabled={
            pending || hearts === MAX_HEARTS || points < POINTS_TO_REFILL
          }
        >
          {hearts === MAX_HEARTS ? (
            "Full"
          ) : (
            <div className="flex items-center gap-x-1">
              <Image src="/points.svg" alt="" height={20} width={20} />

              <p>{POINTS_TO_REFILL}</p>
            </div>
          )}
        </Button>
      </div>

      <div className="flex w-full items-center gap-x-4 border-t-2 p-4 pt-8">
        <Image src="/unlimited.svg" alt="" height={52} width={52} />

        <div className="flex-1">
          <p className="text-base font-extrabold text-neutral-700 lg:text-xl">
            Unlimited hearts
          </p>
          <p className="text-sm text-neutral-500">
            Never run out while you practise
          </p>
        </div>

        <Button
          onClick={onUpgrade}
          disabled={pending || isGifted}
          aria-disabled={pending || isGifted}
        >
          {isGifted ? "Gifted" : hasActiveSubscription ? "Manage" : "Upgrade"}
        </Button>
      </div>
    </ul>
  );
};
