/**
 * Markdown mínimo para o texto do relatório (escrito pela IA) e trechos de
 * exemplo: títulos (`#`, `##`, `###`, `####`), parágrafos, listas (`-`, `*`,
 * `1.`), **negrito** e *itálico*. Devolve uma árvore de dados; quem renderiza
 * monta só elementos de texto do React, então HTML cru nunca chega à página.
 */
export type Inline = { type: "text" | "strong" | "em"; text: string };

export type Block =
  | { type: "h3" | "h4"; inlines: Inline[] }
  | { type: "p"; inlines: Inline[] }
  | { type: "ul" | "ol"; items: Inline[][] };

const INLINE = /\*\*(.+?)\*\*|\*(?![\s*])(.+?)(?<![\s*])\*/g;

export function parseInline(text: string): Inline[] {
  const out: Inline[] = [];
  let last = 0;
  for (const m of text.matchAll(INLINE)) {
    if (m.index > last)
      out.push({ type: "text", text: text.slice(last, m.index) });
    out.push(
      m[1] !== undefined
        ? { type: "strong", text: m[1] }
        : { type: "em", text: m[2] },
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ type: "text", text: text.slice(last) });
  return out;
}

const HEADING = /^(#{1,6})\s+(.+?)\s*#*$/;
const BULLET = /^\s*[-*•]\s+(.+)$/;
const ORDERED = /^\s*\d{1,3}[.)]\s+(.+)$/;
const RULE = /^\s*([-*_])\1{2,}\s*$/;

export function parseMarkdown(source: string): Block[] {
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let list: { type: "ul" | "ol"; items: Inline[][] } | null = null;

  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push({ type: "p", inlines: parseInline(paragraph.join(" ")) });
      paragraph = [];
    }
  };
  const flushList = () => {
    if (list) {
      blocks.push(list);
      list = null;
    }
  };

  for (const raw of source.replace(/\r\n?/g, "\n").split("\n")) {
    const line = raw.trimEnd();

    if (!line.trim() || RULE.test(line)) {
      flushParagraph();
      flushList();
      continue;
    }

    const heading = HEADING.exec(line.trim());
    if (heading) {
      flushParagraph();
      flushList();
      blocks.push({
        type: heading[1].length >= 4 ? "h4" : "h3",
        inlines: parseInline(heading[2]),
      });
      continue;
    }

    const bullet = BULLET.exec(line);
    const ordered = bullet ? null : ORDERED.exec(line);
    const item = bullet ?? ordered;
    if (item) {
      flushParagraph();
      const type = bullet ? "ul" : "ol";
      if (list && list.type !== type) flushList();
      list ??= { type, items: [] };
      list.items.push(parseInline(item[1]));
      continue;
    }

    flushList();
    paragraph.push(line.trim());
  }
  flushParagraph();
  flushList();
  return blocks;
}
