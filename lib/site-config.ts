/**
 * Dados institucionais do site. Os campos `null` aparecem nas páginas legais
 * como "a definir" e precisam ser preenchidos antes do lançamento
 * (ver "Perguntas em aberto" do PRD: CNPJ, domínio, e-mail de contato).
 */
export const SITE = {
  name: "Carta Celeste",
  description:
    "Seu mapa astral personalizado, calculado com precisão astronômica para o dia, a hora e a cidade em que você nasceu. Pronto em minutos na sua área do cliente.",
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

export type Testimonial = {
  quote: string;
  /** Nome, idade e cidade, como o cliente autorizou, ex.: "Mariana, 29, São Paulo". */
  author: string;
  /** Qual mapa a pessoa fez. */
  product: string;
};

/**
 * Depoimentos exibidos na home. A seção só aparece quando há itens aqui.
 * Use SOMENTE depoimentos reais, com autorização por escrito de quem os deu:
 * depoimento inventado é publicidade enganosa (CDC, art. 37).
 */
export const TESTIMONIALS: Testimonial[] = [];
