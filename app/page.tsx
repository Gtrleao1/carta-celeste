import Link from "next/link";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";

export default async function Home({ searchParams }: PageProps<"/">) {
  const params = await searchParams;

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
      {params.conta === "excluida" && (
        <Alert className="max-w-md">
          <AlertDescription>
            Sua conta e seus dados foram excluídos.
          </AlertDescription>
        </Alert>
      )}
      <h1 className="text-4xl font-semibold tracking-tight">Carta Celeste</h1>
      <p className="text-muted-foreground max-w-md text-lg">
        Relatórios astrológicos personalizados, calculados com precisão
        astronômica. Em breve.
      </p>
      <div className="flex gap-3">
        <Link href="/entrar" className={buttonVariants({ size: "lg" })}>
          Entrar
        </Link>
        <Link
          href="/cadastro"
          className={buttonVariants({ size: "lg", variant: "outline" })}
        >
          Criar conta
        </Link>
      </div>
    </main>
  );
}
