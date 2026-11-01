import { lessons, units } from "@/db/schema";
import { unitTheme } from "@/lib/unit-themes";

import { LessonButton } from "./lesson-button";
import { UnitBanner } from "./unit-banner";

type UnitProps = {
  id: number;
  order: number;
  title: string;
  description: string;
  lessons: (typeof lessons.$inferSelect & {
    completed: boolean;
  })[];
  activeLesson:
    | (typeof lessons.$inferSelect & {
        unit: typeof units.$inferSelect;
      })
    | undefined;
  activeLessonPercentage: number;
};

export const Unit = ({
  order,
  title,
  description,
  lessons,
  activeLesson,
  activeLessonPercentage,
}: UnitProps) => {
  const theme = unitTheme(order);
  const isCurrent = lessons.some((lesson) => lesson.id === activeLesson?.id);

  return (
    <>
      <UnitBanner
        order={order}
        title={title}
        description={description}
        theme={theme}
        isCurrent={isCurrent}
      />

      <div className="relative flex flex-col items-center">
        {lessons.map((lesson, i) => {
          const isCurrent = lesson.id === activeLesson?.id;
          const isLocked = !lesson.completed && !isCurrent;

          return (
            <LessonButton
              key={lesson.id}
              id={lesson.id}
              title={lesson.title}
              theme={theme}
              index={i}
              totalCount={lessons.length - 1}
              current={isCurrent}
              locked={isLocked}
              percentage={activeLessonPercentage}
            />
          );
        })}
      </div>
    </>
  );
};
