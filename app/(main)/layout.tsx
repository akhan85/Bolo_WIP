import type { PropsWithChildren } from "react";

import { BottomNav } from "@/components/bottom-nav";
import { MobileTopBar } from "@/components/mobile-top-bar";
import { Sidebar } from "@/components/sidebar";
import { getUserProgress, getUserSubscription } from "@/db/queries";

const MainLayout = async ({ children }: PropsWithChildren) => {
  const [userProgress, userSubscription] = await Promise.all([
    getUserProgress(),
    getUserSubscription(),
  ]);

  return (
    <>
      <MobileTopBar
        courseImageSrc={userProgress?.activeCourse?.imageSrc}
        courseTitle={userProgress?.activeCourse?.title}
        points={userProgress?.points}
        hearts={userProgress?.hearts}
        hasActiveSubscription={!!userSubscription?.isActive}
      />
      <Sidebar className="hidden lg:flex" />
      <main className="min-h-full pb-[84px] pt-[60px] lg:pb-0 lg:ps-[256px] lg:pt-0">
        <div className="mx-auto h-full max-w-[1056px] pt-4 lg:pt-6">
          {children}
        </div>
      </main>
      <BottomNav />
    </>
  );
};

export default MainLayout;
