import Image from "next/image";
import type { ReactNode } from "react";

import type { Doc, Mark, Node } from "@/lib/blog/content";

/**
 * Desenha o texto de um post a partir da árvore de dados (`Doc`). Nada de HTML
 * cru: cada tipo de bloco vira um elemento React. Os estilos são os do corpo
 * do artigo (`.post-body`, em `app/globals.css` via classes utilitárias aqui).
 */
export function PostContent({ doc }: { doc: Doc }) {
  return (
    <div className="grid gap-5 text-lg leading-relaxed">
      {doc.content.map((node, i) => renderBlock(node, i))}
    </div>
  );
}

function renderMarks(text: string, marks: Mark[] | undefined, key: number) {
  let el: ReactNode = text;
  for (const mark of marks ?? []) {
    if (mark.type === "bold") el = <strong>{el}</strong>;
    else if (mark.type === "italic") el = <em>{el}</em>;
    else if (mark.type === "link") {
      const external = /^https?:\/\//i.test(mark.attrs.href);
      el = (
        <a
          href={mark.attrs.href}
          className="text-primary underline underline-offset-4"
          {...(external && {
            target: "_blank",
            rel: "noopener noreferrer nofollow",
          })}
        >
          {el}
        </a>
      );
    }
  }
  return <span key={key}>{el}</span>;
}

function renderInline(nodes: Node[] | undefined) {
  return (nodes ?? []).map((n, i) =>
    n.type === "text" ? (
      renderMarks(n.text, n.marks, i)
    ) : n.type === "hardBreak" ? (
      <br key={i} />
    ) : null,
  );
}

function renderBlock(node: Node, key: number): ReactNode {
  switch (node.type) {
    case "paragraph":
      // Parágrafo vazio vira espaço; o editor os cria ao apertar Enter duas vezes.
      return node.content?.length ? (
        <p key={key}>{renderInline(node.content)}</p>
      ) : null;
    case "heading":
      return node.attrs.level === 2 ? (
        <h2 key={key} className="mt-6 text-3xl font-semibold">
          {renderInline(node.content)}
        </h2>
      ) : (
        <h3 key={key} className="mt-4 text-2xl font-semibold">
          {renderInline(node.content)}
        </h3>
      );
    case "bulletList":
      return (
        <ul key={key} className="grid list-disc gap-2 pl-6">
          {node.content.map((li, i) => renderBlock(li, i))}
        </ul>
      );
    case "orderedList":
      return (
        <ol key={key} className="grid list-decimal gap-2 pl-6">
          {node.content.map((li, i) => renderBlock(li, i))}
        </ol>
      );
    case "listItem":
      return (
        // Sem `grid` aqui: ele tiraria o marcador (bolinha/número) do item.
        <li key={key} className="[&>*+*]:mt-2">
          {node.content.map((child, i) => renderBlock(child, i))}
        </li>
      );
    case "blockquote":
      return (
        <blockquote
          key={key}
          className="border-primary text-muted-foreground grid gap-3 border-l-4 pl-5 italic"
        >
          {node.content.map((child, i) => renderBlock(child, i))}
        </blockquote>
      );
    case "horizontalRule":
      return <hr key={key} className="border-border my-4" />;
    case "image": {
      const { src, alt, width, height } = node.attrs;
      return (
        <figure key={key} className="grid gap-2">
          <Image
            src={src}
            alt={alt}
            width={width ?? 1600}
            height={height ?? 900}
            sizes="(min-width: 768px) 720px, 100vw"
            className="h-auto w-full rounded-xl"
          />
          {alt && (
            <figcaption className="text-muted-foreground text-center text-sm">
              {alt}
            </figcaption>
          )}
        </figure>
      );
    }
    default:
      return null;
  }
}
