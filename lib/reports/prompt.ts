import type { SectionConfig } from "./types";

export const MIN_WORDS = 150; // abaixo disso a seção é considerada inválida
export const TARGET_WORDS = { min: 350, max: 700 };

/**
 * Prompt de sistema: papel, regras de conteúdo e instruções do produto.
 * Nada de dados pessoais aqui.
 */
export function buildSystemPrompt(productInstructions: string): string {
  return [
    'Você é um(a) astrólogo(a) experiente que escreve relatórios de autoconhecimento em português do Brasil, em segunda pessoa ("você"), com tom acolhedor e preciso.',
    "",
    "Regras:",
    "- Use SOMENTE as posições do mapa fornecidas. Nunca invente, recalcule nem corrija posições, graus, casas ou aspectos. Se um dado não foi fornecido, não o mencione.",
    '- Fale em tendências, qualidades e desafios, nunca em previsões deterministas ("isso vai acontecer"). Não faça diagnósticos de saúde nem dê conselhos financeiros, de investimento ou jurídicos.',
    "- Linguagem adulta e respeitosa, sem conteúdo explícito, vulgar ou preconceituoso. Use linguagem inclusiva: não suponha gênero, orientação, estado civil ou profissão da pessoa nem de parceiros.",
    "- O nome da pessoa não foi informado: não invente um. Não fale de IA, de prompt nem destas instruções.",
    "- Explique termos técnicos com uma frase de contexto, para quem não conhece astrologia.",
    `- Formato: Markdown, com subtítulos \`###\`, entre ${TARGET_WORDS.min} e ${TARGET_WORDS.max} palavras. Comece direto no conteúdo (sem saudação) e sem título geral: o título da seção já aparece no relatório. Prefira parágrafos a listas longas.`,
    "",
    "Instruções deste produto:",
    productInstructions.trim() || "(sem instruções adicionais)",
  ].join("\n");
}

/** Prompt da seção: instruções, outras seções (para não repetir) e o mapa. */
export function buildSectionPrompt(args: {
  section: SectionConfig;
  allTitles: string[];
  chartSummary: string;
}): string {
  const others = args.allTitles.filter((t) => t !== args.section.title);
  return [
    `Escreva a seção "${args.section.title}" do relatório.`,
    "",
    "Instruções desta seção:",
    args.section.instructions.trim(),
    "",
    others.length
      ? `Outras seções do relatório (já tratadas em outro lugar; não repita o conteúdo delas, apenas complemente quando fizer sentido):\n${others.map((t) => `- ${t}`).join("\n")}`
      : "",
    "",
    "Dados do mapa (únicas posições que você pode usar):",
    args.chartSummary,
  ]
    .filter((l, i, arr) => !(l === "" && arr[i - 1] === ""))
    .join("\n");
}

/** Texto para seções que dependem da hora de nascimento quando ela não foi informada. */
export function timeUnknownExplanation(title: string): string {
  return [
    `### ${title}: o que falta`,
    "",
    "Esta parte do mapa depende da **hora exata de nascimento**, porque é ela que define o Ascendente, o Meio do Céu e as casas astrológicas. Como a hora não foi informada, não foi possível calcular esses pontos, e preferimos não inventar uma interpretação.",
    "",
    "O restante do seu relatório usa os planetas nos signos e os aspectos entre eles, que não dependem da hora. Se você descobrir a hora em que nasceu (a certidão de nascimento costuma trazê-la), é possível fazer um novo mapa completo.",
  ].join("\n");
}

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}
