"use client";

import Image from "@tiptap/extension-image";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useRef, useState } from "react";

import { uploadBlogImage } from "@/lib/blog/upload-image";
import type { Doc } from "@/lib/blog/content";

type Props = {
  initial: Doc;
  /** Chamado a cada mudança, com o JSON do texto. */
  onChange: (doc: Doc) => void;
  invalid?: boolean;
};

const btn =
  "border-border hover:bg-muted focus-visible:ring-ring inline-flex h-10 min-w-10 items-center justify-center rounded-md border px-2.5 text-sm font-medium focus-visible:ring-2 disabled:opacity-40";
const btnOn = "bg-primary/15 border-primary text-foreground";

/**
 * Editor de texto visual (como o do WordPress): títulos, negrito, itálico,
 * listas, citação, link e imagens, com barra de ferramentas em português. O
 * resultado é salvo como JSON e só os blocos permitidos chegam ao site.
 */
export function RichEditor({ initial, onChange, invalid }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");

  const editor = useEditor({
    immediatelyRender: false, // evita diferença entre servidor e navegador
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        codeBlock: false,
        code: false,
        strike: false,
        underline: false,
        link: { openOnClick: false, autolink: true },
      }),
      Image.configure({ inline: false }),
    ],
    content: initial,
    editorProps: {
      attributes: {
        "aria-label": "Texto do post",
        class:
          "post-editor min-h-[360px] px-4 py-3 text-lg leading-relaxed outline-none",
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getJSON() as Doc),
  });

  // Reage a mudanças de seleção (botão ativo, imagem selecionada).
  const state = useEditorState({
    editor,
    selector: (ctx) => ({
      h2: ctx.editor?.isActive("heading", { level: 2 }) ?? false,
      h3: ctx.editor?.isActive("heading", { level: 3 }) ?? false,
      bold: ctx.editor?.isActive("bold") ?? false,
      italic: ctx.editor?.isActive("italic") ?? false,
      bullet: ctx.editor?.isActive("bulletList") ?? false,
      ordered: ctx.editor?.isActive("orderedList") ?? false,
      quote: ctx.editor?.isActive("blockquote") ?? false,
      link: ctx.editor?.isActive("link") ?? false,
      image: ctx.editor?.isActive("image") ?? false,
      imageAlt: (ctx.editor?.getAttributes("image").alt as string) ?? "",
      canUndo: ctx.editor?.can().undo() ?? false,
      canRedo: ctx.editor?.can().redo() ?? false,
    }),
  });

  if (!editor || !state) {
    return (
      <div
        className="border-border text-muted-foreground min-h-[420px] rounded-lg border p-4 text-sm"
        role="status"
      >
        Carregando o editor…
      </div>
    );
  }

  async function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !editor) return;
    setBusy(true);
    setUploadError(null);
    try {
      const img = await uploadBlogImage(file);
      editor
        .chain()
        .focus()
        .setImage({
          src: img.url,
          alt: "",
          ...(img.width && { width: img.width }),
          ...(img.height && { height: img.height }),
        })
        .run();
    } catch (err) {
      setUploadError(
        err instanceof Error
          ? err.message
          : "Não foi possível enviar a imagem.",
      );
    } finally {
      setBusy(false);
    }
  }

  function openLink() {
    setLinkUrl(editor?.getAttributes("link").href ?? "https://");
    setLinkOpen(true);
  }

  function applyLink() {
    const href = linkUrl.trim();
    if (!editor) return;
    if (!href || href === "https://") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
    }
    setLinkOpen(false);
  }

  const on = (active: boolean) => `${btn} ${active ? btnOn : ""}`;

  return (
    <div
      className={`bg-background rounded-lg border ${invalid ? "border-destructive" : "border-border"}`}
    >
      <div
        role="toolbar"
        aria-label="Formatação do texto"
        // Clicar num botão não tira o foco do texto: o cursor fica onde estava.
        onMouseDown={(e) => {
          if ((e.target as HTMLElement).closest("button")) e.preventDefault();
        }}
        className="border-border bg-muted/40 sticky top-14 z-10 flex flex-wrap gap-1.5 rounded-t-lg border-b p-2"
      >
        <button
          type="button"
          className={on(state.h2)}
          aria-pressed={state.h2}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
        >
          Título
        </button>
        <button
          type="button"
          className={on(state.h3)}
          aria-pressed={state.h3}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
        >
          Subtítulo
        </button>
        <button
          type="button"
          className={on(state.bold)}
          aria-pressed={state.bold}
          aria-label="Negrito"
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <strong>N</strong>
        </button>
        <button
          type="button"
          className={on(state.italic)}
          aria-pressed={state.italic}
          aria-label="Itálico"
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <em>I</em>
        </button>
        <button
          type="button"
          className={on(state.bullet)}
          aria-pressed={state.bullet}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          • Lista
        </button>
        <button
          type="button"
          className={on(state.ordered)}
          aria-pressed={state.ordered}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          1. Lista
        </button>
        <button
          type="button"
          className={on(state.quote)}
          aria-pressed={state.quote}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          Citação
        </button>
        <button
          type="button"
          className={on(state.link)}
          aria-pressed={state.link}
          onClick={openLink}
        >
          Link
        </button>
        <button
          type="button"
          className={btn}
          disabled={busy}
          onClick={() => fileRef.current?.click()}
        >
          {busy ? "Enviando…" : "Imagem"}
        </button>
        <button
          type="button"
          className={btn}
          aria-label="Linha separadora"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
        >
          —
        </button>
        <span className="ml-auto flex gap-1.5">
          <button
            type="button"
            className={btn}
            disabled={!state.canUndo}
            aria-label="Desfazer"
            onClick={() => editor.chain().focus().undo().run()}
          >
            ↶
          </button>
          <button
            type="button"
            className={btn}
            disabled={!state.canRedo}
            aria-label="Refazer"
            onClick={() => editor.chain().focus().redo().run()}
          >
            ↷
          </button>
        </span>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={onPickImage}
        />
      </div>

      {linkOpen && (
        <div className="border-border bg-muted/20 flex flex-wrap items-center gap-2 border-b p-2">
          <label htmlFor="editor-link" className="text-sm font-medium">
            Endereço do link
          </label>
          <input
            id="editor-link"
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                applyLink();
              }
            }}
            className="border-input bg-background h-10 min-w-0 flex-1 rounded-md border px-3 text-base"
            placeholder="https://"
          />
          <button type="button" className={btn} onClick={applyLink}>
            Aplicar
          </button>
          <button
            type="button"
            className={btn}
            onClick={() => setLinkOpen(false)}
          >
            Cancelar
          </button>
        </div>
      )}

      {state.image && (
        <div className="border-border bg-muted/20 flex flex-wrap items-center gap-2 border-b p-2">
          <label htmlFor="editor-alt" className="text-sm font-medium">
            Descrição da imagem
          </label>
          <input
            id="editor-alt"
            type="text"
            value={state.imageAlt}
            maxLength={300}
            onChange={(e) =>
              editor
                .chain()
                .updateAttributes("image", { alt: e.target.value })
                .run()
            }
            className="border-input bg-background h-10 min-w-0 flex-1 rounded-md border px-3 text-base"
            placeholder="Para quem não vê a imagem e para o Google"
          />
        </div>
      )}

      {uploadError && (
        <p
          role="alert"
          className="text-destructive border-border border-b p-2 text-sm"
        >
          {uploadError}
        </p>
      )}

      <EditorContent editor={editor} />
    </div>
  );
}
