/**
 * Dados institucionais do site. Os campos `null` aparecem nas páginas legais
 * como "a definir" e precisam ser preenchidos antes do lançamento
 * (ver "Perguntas em aberto" do PRD: CNPJ, domínio, e-mail de contato).
 */
export const SITE = {
  name: "Carta Celeste",
  description:
    "Relatórios astrológicos personalizados, calculados com precisão astronômica e interpretados por IA, entregues na sua área do cliente.",
  /** Razão social do responsável pelo site. */
  legalName: null as string | null,
  /** CNPJ do responsável. */
  cnpj: null as string | null,
  /** E-mail para contato e para exercer direitos da LGPD. */
  contactEmail: null as string | null,
  legalUpdatedAt: "5 de outubro de 2026",
};

export const DISCLAIMER =
  "Conteúdo para autoconhecimento e entretenimento. Não substitui orientação médica, psicológica, financeira ou jurídica.";
