import Image from "next/image";

export const Footer = () => {
  return (
    <footer className="w-full border-t-2 px-4 py-6">
      <div className="mx-auto flex max-w-[1040px] flex-col items-center justify-between gap-3 text-sm text-neutral-400 sm:flex-row">
        <div className="flex items-center gap-x-2 font-bold">
          <Image
            src="/pk.svg"
            alt=""
            height={20}
            width={27}
            className="rounded-[4px] border"
          />
          Learn Urdu with Bolo
        </div>
        <p>Speak first. Read next. A little every day.</p>
      </div>
    </footer>
  );
};
