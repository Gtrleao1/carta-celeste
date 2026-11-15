import type { Metadata } from "next";

import { NotFoundContent } from "@/components/site/not-found-content";

export const metadata: Metadata = { title: "Página não encontrada" };

/** 404 de páginas do site que chamam `notFound()` (produto, post, pedido…). */
export default function NotFound() {
  return <NotFoundContent />;
}
