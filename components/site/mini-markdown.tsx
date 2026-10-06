/**
 * Renderizador mínimo de Markdown para trechos curtos (`###` títulos,
 * parágrafos e listas com "- "). Gera só elementos de texto do React, nunca
 * HTML cru, então é seguro para conteúdo vindo do banco.
 */
export function MiniMarkdown({ text }: { text: string }) {
  const blocks = text.trim().split(/\n{2,}/);
  return (
    <div className="grid gap-3">
      {blocks.map((block, i) => {
        const lines = block.split("\n");
        if (lines.every((l) => l.startsWith("- "))) {
          return (
            <ul key={i} className="list-disc space-y-1 pl-5">
              {lines.map((l, j) => (
                <li key={j}>{l.slice(2)}</li>
              ))}
            </ul>
          );
        }
        if (block.startsWith("### ")) {
          return (
            <h3 key={i} className="font-heading text-xl font-semibold">
              {block.slice(4)}
            </h3>
          );
        }
        return <p key={i}>{block}</p>;
      })}
    </div>
  );
}
