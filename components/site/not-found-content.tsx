import { ErrorState } from "@/components/site/error-state";

/** Conteúdo da página 404, igual onde quer que ela apareça. */
export function NotFoundContent() {
  return (
    <ErrorState eyebrow="Erro 404" title="Não encontramos esta página">
      <p>
        O endereço pode ter mudado ou ter sido digitado errado. Volte ao início
        para continuar de onde parou.
      </p>
    </ErrorState>
  );
}
