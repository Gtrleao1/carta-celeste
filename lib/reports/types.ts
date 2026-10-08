/** Como uma seção é configurada no produto (products.report_sections). */
export type SectionConfig = {
  key: string;
  title: string;
  /** Instruções específicas da seção para a IA (nunca vão para o cliente). */
  instructions: string;
  /** Depende de casas ou ângulos; sem hora de nascimento é trocada por uma explicação. */
  needs_houses?: boolean;
};

export type SectionStatus = "pending" | "done" | "failed";

/**
 * Estado de uma seção em reports.sections. É legível pelo dono do pedido (RLS),
 * então NÃO guarda instruções nem mensagens de erro internas.
 */
export type SectionState = {
  key: string;
  title: string;
  content: string;
  status: SectionStatus;
  /** Tentativas que falharam até agora. */
  attempts: number;
  /** Categoria curta do último erro (ex.: "limite_de_uso"); nunca o texto bruto. */
  error?: string;
};

export const MAX_ATTEMPTS = 3;

export const initialSections = (config: SectionConfig[]): SectionState[] =>
  config.map((s) => ({
    key: s.key,
    title: s.title,
    content: "",
    status: "pending",
    attempts: 0,
  }));
