import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

/**
 * Tela de "algo não deu certo" (404 e erros), em português e sem detalhes
 * técnicos para o cliente. `code` é o identificador do erro no log do servidor
 * (ajuda o suporte a achar a causa), nunca a mensagem do erro.
 */
export function ErrorState({
  eyebrow,
  title,
  children,
  code,
  actions,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
  code?: string;
  /** Botão principal (por exemplo, "Tentar de novo"); os links de saída vêm sempre. */
  actions?: React.ReactNode;
}) {
  return (
    <section className="mx-auto grid w-full max-w-xl justify-items-center gap-6 px-4 py-20 text-center">
      <p className="text-primary text-sm font-medium tracking-widest uppercase">
        {eyebrow}
      </p>
      <h1 className="text-5xl leading-tight font-semibold text-balance">
        {title}
      </h1>
      <div className="text-muted-foreground max-w-prose text-lg leading-relaxed">
        {children}
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        {actions}
        <Link
          href="/"
          className={
            buttonVariants({
              size: "lg",
              variant: actions ? "outline" : "default",
            }) + " h-12 px-6 text-base"
          }
        >
          Voltar ao início
        </Link>
        <Link
          href="/blog"
          className={
            buttonVariants({ size: "lg", variant: "outline" }) +
            " h-12 px-6 text-base"
          }
        >
          Ler o blog
        </Link>
      </div>
      {code && (
        <p className="text-muted-foreground text-xs">
          Se o problema continuar, informe este código ao suporte:{" "}
          <span className="font-mono">{code}</span>
        </p>
      )}
    </section>
  );
}
