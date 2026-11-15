import type { Metadata } from "next";

import { NotFoundContent } from "@/components/site/not-found-content";
import { SiteFooter } from "@/components/site/footer";
import { SiteHeader } from "@/components/site/header";
import { SkyStars } from "@/components/site/sky-backdrop";

export const metadata: Metadata = { title: "Página não encontrada" };

/**
 * 404 de endereços que não existem. Fica fora do layout do site (`(site)`),
 * então repete cabeçalho e rodapé; páginas do site que chamam `notFound()`
 * usam `app/(site)/not-found.tsx`, que já está dentro do layout.
 */
export default function NotFound() {
  return (
    <>
      <SkyStars />
      <SiteHeader />
      <main id="conteudo" className="flex-1">
        <NotFoundContent />
      </main>
      <SiteFooter />
    </>
  );
}
