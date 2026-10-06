import Link from "next/link";

import { ThemeToggle } from "@/components/site/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import { SITE } from "@/lib/site-config";

export function SiteHeader() {
  return (
    <header className="border-border bg-background sticky top-0 z-40 border-b">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4">
        <Link
          href="/"
          className="font-heading text-primary text-2xl font-semibold tracking-tight"
        >
          {SITE.name}
        </Link>

        <nav
          aria-label="Principal"
          className="flex items-center gap-1 sm:gap-2"
        >
          <Link
            href="/#mapas"
            className="text-muted-foreground hover:text-foreground hidden rounded-md px-3 py-2 text-sm sm:block"
          >
            Mapas
          </Link>
          <Link
            href="/#como-funciona"
            className="text-muted-foreground hover:text-foreground hidden rounded-md px-3 py-2 text-sm md:block"
          >
            Como funciona
          </Link>
          <Link
            href="/#perguntas"
            className="text-muted-foreground hover:text-foreground hidden rounded-md px-3 py-2 text-sm md:block"
          >
            Perguntas
          </Link>
          <Link
            href="/entrar"
            className={buttonVariants({ variant: "outline", size: "lg" })}
          >
            Entrar
          </Link>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
