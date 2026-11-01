import { ArrowLeft } from "lucide-react";
import Link from "next/link";

type HeaderProps = {
  title: string;
};

// Stays pinned while scrolling the lesson path; sits under the phone top bar.
export const Header = ({ title }: HeaderProps) => {
  return (
    <div className="sticky top-[60px] z-40 mb-5 flex items-center justify-between border-b-2 bg-white py-3 text-neutral-400 lg:top-0 lg:-mt-6 lg:pt-6">
      <Link
        href="/courses"
        aria-label="Change course"
        className="rounded-xl p-2 transition hover:bg-slate-100"
      >
        <ArrowLeft className="h-5 w-5 stroke-2" />
      </Link>

      <h1 className="text-lg font-extrabold text-neutral-500">{title}</h1>
      <div className="w-9" aria-hidden />
    </div>
  );
};
