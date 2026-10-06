import { SITE } from "@/lib/site-config";

/** Valor institucional ainda não definido aparece como "a definir". */
export const orPending = (value: string | null) =>
  value ?? "(a definir antes do lançamento)";

/** Estrutura e tipografia das páginas legais. */
export function LegalPage({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-12">
      <h1 className="text-5xl font-semibold text-balance">{title}</h1>
      <p className="text-muted-foreground mt-3 text-sm">
        Última atualização: {SITE.legalUpdatedAt}
      </p>
      <div className="[&_a]:text-primary mt-8 grid gap-4 text-lg leading-relaxed [&_a]:underline [&_a]:underline-offset-4 [&_h2]:mt-6 [&_h2]:text-3xl [&_h2]:font-semibold [&_li]:ml-1 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6">
        {children}
      </div>
    </article>
  );
}
