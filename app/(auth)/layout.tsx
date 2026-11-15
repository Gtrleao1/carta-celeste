import Link from "next/link";

import { SkyBackdrop, SkyStars } from "@/components/site/sky-backdrop";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SkyStars />
      <main className="relative isolate flex flex-1 flex-col items-center justify-center gap-6 overflow-x-clip px-4 py-10">
        <SkyBackdrop />
        <Link href="/" className="text-2xl font-semibold tracking-tight">
          Carta Celeste
        </Link>
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </>
  );
}
