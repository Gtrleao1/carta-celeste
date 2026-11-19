import { parseMarkdown, type Inline } from "@/lib/markdown";

function Inlines({ items }: { items: Inline[] }) {
  return items.map((inline, i) =>
    inline.type === "strong" ? (
      <strong key={i}>{inline.text}</strong>
    ) : inline.type === "em" ? (
      <em key={i}>{inline.text}</em>
    ) : (
      inline.text
    ),
  );
}

/**
 * Renderiza o Markdown mínimo de `lib/markdown.ts`. Gera só elementos de texto
 * do React, nunca HTML cru, então é seguro para conteúdo vindo do banco ou da IA.
 */
export function MiniMarkdown({
  text,
  headingIdPrefix,
}: {
  text: string;
  /**
   * Quando informado, cada subtítulo (`###`) ganha o `id` `<prefixo>-sub-<n>`
   * (n = ordem do subtítulo, a partir de 0), o endereço que o leitor usa para
   * levar a pessoa até ele (`subtopicsOf` gera os mesmos ids).
   */
  headingIdPrefix?: string;
}) {
  let h3Count = 0;
  return (
    <div className="grid gap-3">
      {parseMarkdown(text).map((block, i) => {
        switch (block.type) {
          case "ul":
            return (
              <ul key={i} className="list-disc space-y-1 pl-5">
                {block.items.map((item, j) => (
                  <li key={j}>
                    <Inlines items={item} />
                  </li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol key={i} className="list-decimal space-y-1 pl-5">
                {block.items.map((item, j) => (
                  <li key={j}>
                    <Inlines items={item} />
                  </li>
                ))}
              </ol>
            );
          case "h3":
            return (
              <h3
                key={i}
                id={
                  headingIdPrefix
                    ? `${headingIdPrefix}-sub-${h3Count++}`
                    : undefined
                }
                className="font-heading print-avoid-break mt-2 scroll-mt-40 text-xl font-semibold"
              >
                <Inlines items={block.inlines} />
              </h3>
            );
          case "h4":
            return (
              <h4 key={i} className="print-avoid-break mt-1 font-semibold">
                <Inlines items={block.inlines} />
              </h4>
            );
          default:
            return (
              <p key={i}>
                <Inlines items={block.inlines} />
              </p>
            );
        }
      })}
    </div>
  );
}
