import type { PropsWithChildren } from "react";

// Full-screen lesson: header and footer stay put, the middle scrolls if a
// question is taller than the screen. dvh avoids mobile browser-bar jumps.
const LessonLayout = ({ children }: PropsWithChildren) => {
  return (
    <div className="flex h-screen flex-col overflow-hidden supports-[height:100dvh]:h-[100dvh]">
      {children}
    </div>
  );
};

export default LessonLayout;
