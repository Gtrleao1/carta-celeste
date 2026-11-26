"use client";

import { Printer } from "lucide-react";

import { Button } from "@/components/ui/button";

/** Ação secundária da leitura: abre a impressão, onde também se salva em PDF. */
export function PrintButton() {
  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      title="Imprimir ou salvar em PDF"
      className="no-print h-11 w-full gap-2 lg:h-9"
      onClick={() => window.print()}
    >
      <Printer aria-hidden="true" />
      Salvar PDF
    </Button>
  );
}
