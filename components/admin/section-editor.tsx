"use client";

import { useActionState, useState } from "react";

import { saveSection } from "@/app/admin/pedidos-actions";
import { FormMessage, SubmitButton } from "@/components/auth/form-parts";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { FormState } from "@/lib/auth/form-state";

/**
 * Editor de UMA parte do mapa: título e texto (Markdown simples: `###` para
 * subtítulo, `**negrito**`, listas com `-`). Cada parte tem o seu formulário e
 * o seu botão. `version` é a versão da parte quando a página abriu; se ela
 * mudou nesse meio-tempo, o servidor recusa em vez de sobrescrever.
 */
export function SectionEditor({
  orderId,
  sectionKey,
  title: initialTitle,
  content: initialContent,
  version,
  editedAt,
}: {
  orderId: string;
  sectionKey: string;
  title: string;
  content: string;
  version: string;
  editedAt: string | null;
}) {
  const [state, action] = useActionState<FormState, FormData>(saveSection, {});
  // Controlados: o React 19 reseta o formulário após a ação e apagaria a edição.
  const [title, setTitle] = useState(initialTitle);
  const [text, setText] = useState(initialContent);
  const titleErrors = state.fieldErrors?.title;
  const contentErrors = state.fieldErrors?.content;

  return (
    <form action={action} className="grid gap-3" noValidate>
      <input type="hidden" name="order_id" value={orderId} />
      <input type="hidden" name="key" value={sectionKey} />
      <input type="hidden" name="version" value={version} />

      <div className="grid gap-1.5">
        <Label htmlFor={`title-${sectionKey}`}>Título da parte</Label>
        <Input
          id={`title-${sectionKey}`}
          name="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          aria-invalid={titleErrors ? true : undefined}
          className="h-11 text-base"
        />
        {titleErrors && (
          <p role="alert" className="text-destructive text-sm">
            {titleErrors.join(" ")}
          </p>
        )}
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor={`content-${sectionKey}`}>Texto</Label>
        <textarea
          id={`content-${sectionKey}`}
          name="content"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={Math.min(28, Math.max(10, Math.ceil(text.length / 90)))}
          aria-invalid={contentErrors ? true : undefined}
          className="border-input bg-background focus-visible:ring-ring/50 w-full rounded-lg border p-3 font-mono text-sm leading-relaxed outline-none focus-visible:ring-3"
        />
        {contentErrors && (
          <p role="alert" className="text-destructive text-sm">
            {contentErrors.join(" ")}
          </p>
        )}
        <p className="text-muted-foreground text-xs">
          {text.length.toLocaleString("pt-BR")} caracteres
          {editedAt ? ` · editado à mão em ${editedAt}` : ""}
        </p>
      </div>

      <FormMessage state={state} />
      <div className="max-w-xs">
        <SubmitButton pendingText="Salvando…">Salvar esta parte</SubmitButton>
      </div>
    </form>
  );
}
