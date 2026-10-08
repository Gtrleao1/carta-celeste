export type WriteRequest = {
  system: string;
  prompt: string;
  maxTokens: number;
  /** Tempo máximo desta chamada, em ms (limitado pelo tempo que resta da função). */
  timeoutMs: number;
};

export type WriteResult = {
  text: string;
  inputTokens: number;
  outputTokens: number;
};

/** Categorias de falha, seguras para guardar e mostrar (nunca a mensagem bruta). */
export type WriteErrorKind =
  | "limite_de_uso"
  | "tempo_esgotado"
  | "recusa"
  | "texto_cortado"
  | "autenticacao"
  | "indisponivel"
  | "desconhecido";

export class WriteError extends Error {
  constructor(
    readonly kind: WriteErrorKind,
    detail?: string,
  ) {
    super(detail ?? kind);
    this.name = "WriteError";
  }
}

/** Escreve um texto a partir de um prompt. Quem implementa fala com o provedor de IA. */
export interface SectionWriter {
  write(request: WriteRequest): Promise<WriteResult>;
}
