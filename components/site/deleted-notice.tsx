"use client";

import { useSearchParams } from "next/navigation";

import { Alert, AlertDescription } from "@/components/ui/alert";

/** Aviso exibido depois de excluir a conta (?conta=excluida). Fica fora do HTML estático da home. */
export function DeletedNotice() {
  const params = useSearchParams();
  if (params.get("conta") !== "excluida") return null;
  return (
    <div className="mx-auto w-full max-w-6xl px-4 pt-6">
      <Alert>
        <AlertDescription>
          Sua conta e seus dados foram excluídos.
        </AlertDescription>
      </Alert>
    </div>
  );
}
