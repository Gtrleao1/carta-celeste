"use client";

import { Button } from "@/components/ui/button";

export function PrintButton() {
  return (
    <Button
      type="button"
      size="lg"
      className="no-print h-11 text-base"
      onClick={() => window.print()}
    >
      Imprimir / salvar PDF
    </Button>
  );
}
