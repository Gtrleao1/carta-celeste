import Link from "next/link";

import { MainNav } from "@/components/site/main-nav";
import { SITE } from "@/lib/site-config";

export function SiteHeader() {
  return (
    <header className="no-print border-border bg-background sticky top-0 z-40 border-b">
      <div className="relative mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4">
        <Link
          href="/"
          className="font-heading text-primary text-2xl font-semibold tracking-tight"
        >
          {SITE.name}
        </Link>
        <MainNav />
      </div>
    </header>
  );
}
