import Link from "next/link";

import { DISCLAIMER, SITE } from "@/lib/site-config";

export function SiteFooter() {
  return (
    <footer className="no-print border-border/60 mt-auto border-t">
      <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-10 text-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-heading text-primary text-xl font-semibold">
            {SITE.name}
          </p>
          <nav aria-label="Rodapé" className="flex flex-wrap gap-x-5 gap-y-2">
            <Link href="/#mapas" className="hover:underline">
              Mapas
            </Link>
            <Link href="/#como-funciona" className="hover:underline">
              Como funciona
            </Link>
            <Link href="/#perguntas" className="hover:underline">
              Perguntas
            </Link>
            <Link href="/termos" className="hover:underline">
              Termos de Uso
            </Link>
            <Link href="/privacidade" className="hover:underline">
              Política de Privacidade
            </Link>
          </nav>
        </div>
        <p className="text-muted-foreground max-w-3xl">{DISCLAIMER}</p>
        <p className="text-muted-foreground">
          © {new Date().getFullYear()} {SITE.name}. Todos os direitos
          reservados.
        </p>
      </div>
    </footer>
  );
}
