import Link from "next/link";

import { SkyBackdrop, SkyStars } from "@/components/site/sky-backdrop";
import { SITE } from "@/lib/site-config";

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
          {SITE.name}
        </Link>
        {/* Largura que cabe o formulário de cadastro com dados de nascimento. */}
        <div className="w-full max-w-md">{children}</div>
      </main>
    </>
  );
}
