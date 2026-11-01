import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-y-6 px-4 py-16 text-center">
      <Image src="/mascot_sad.svg" alt="" height={100} width={100} />
      <div className="space-y-2">
        <h1 className="text-3xl font-black text-neutral-700">Page not found</h1>
        <p className="text-neutral-500">
          This page doesn&apos;t exist, but your lessons do.
        </p>
      </div>
      <Button variant="secondary" size="lg" asChild>
        <Link href="/learn">Back to learning</Link>
      </Button>
    </div>
  );
}
