"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type EditableSection = {
  key: string;
  title: string;
  instructions: string;
  needs_houses?: boolean;
};

/** `Sua vocação (Saturno)` -> `sua-vocacao-saturno`, para sugerir a chave da seção. */
export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

/**
 * Editor da lista de seções do relatório. O estado vai para o formulário como
 * JSON em um campo oculto (`sections`); o servidor valida tudo de novo.
 */
export function SectionsEditor({
  initial,
  error,
}: {
  initial: EditableSection[];
  error?: string;
}) {
  const [sections, setSections] = useState<EditableSection[]>(initial);
  // Chaves já editadas à mão não acompanham mais o título.
  const [manualKeys, setManualKeys] = useState<Set<number>>(
    () => new Set(initial.flatMap((section, i) => (section.key ? [i] : []))),
  );

  const update = (i: number, patch: Partial<EditableSection>) =>
    setSections((prev) =>
      prev.map((s, j) => (j === i ? { ...s, ...patch } : s)),
    );

  const move = (i: number, delta: -1 | 1) => {
    const j = i + delta;
    if (j < 0 || j >= sections.length) return;
    setSections((prev) => {
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
    setManualKeys((prev) => {
      const next = new Set<number>();
      for (const k of prev) next.add(k === i ? j : k === j ? i : k);
      return next;
    });
  };

  const remove = (i: number) => {
    setSections((prev) => prev.filter((_, j) => j !== i));
    setManualKeys((prev) => {
      const next = new Set<number>();
      for (const k of prev) if (k !== i) next.add(k > i ? k - 1 : k);
      return next;
    });
  };

  return (
    <fieldset className="grid gap-4">
      <legend className="text-lg font-semibold">Seções do relatório</legend>
      <p className="text-muted-foreground text-sm">
        Cada seção vira uma chamada à IA, na ordem abaixo. A instrução diz o que
        escrever nela. Marque &quot;Depende da hora&quot; nas seções de casas e
        ângulos: sem hora de nascimento, elas viram uma explicação, sem gastar
        IA.
      </p>
      <input type="hidden" name="sections" value={JSON.stringify(sections)} />

      <ol className="grid gap-4">
        {sections.map((s, i) => (
          <li
            key={i}
            className="border-border bg-card grid gap-3 rounded-lg border p-3"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground text-sm font-medium">
                Seção {i + 1}
              </span>
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={i === 0}
                  onClick={() => move(i, -1)}
                  aria-label={`Subir a seção ${i + 1}`}
                >
                  ↑
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={i === sections.length - 1}
                  onClick={() => move(i, 1)}
                  aria-label={`Descer a seção ${i + 1}`}
                >
                  ↓
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => remove(i)}
                  aria-label={`Remover a seção ${i + 1}`}
                >
                  Remover
                </Button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor={`sec-title-${i}`}>Título</Label>
                <Input
                  id={`sec-title-${i}`}
                  value={s.title}
                  maxLength={80}
                  className="h-11 text-base"
                  onChange={(e) => {
                    const title = e.target.value;
                    update(
                      i,
                      manualKeys.has(i)
                        ? { title }
                        : { title, key: slugify(title) },
                    );
                  }}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor={`sec-key-${i}`}>Chave</Label>
                <Input
                  id={`sec-key-${i}`}
                  value={s.key}
                  maxLength={40}
                  className="h-11 font-mono text-base"
                  onChange={(e) => {
                    setManualKeys((prev) => new Set(prev).add(i));
                    update(i, { key: e.target.value });
                  }}
                />
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor={`sec-inst-${i}`}>Instruções para a IA</Label>
              <Textarea
                id={`sec-inst-${i}`}
                value={s.instructions}
                maxLength={3000}
                rows={4}
                onChange={(e) => update(i, { instructions: e.target.value })}
              />
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="accent-primary size-5"
                checked={Boolean(s.needs_houses)}
                onChange={(e) => update(i, { needs_houses: e.target.checked })}
              />
              Depende da hora de nascimento (casas, Ascendente, Meio do Céu)
            </label>
          </li>
        ))}
      </ol>

      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}

      <Button
        type="button"
        variant="outline"
        size="lg"
        className="h-11 w-fit"
        disabled={sections.length >= 20}
        onClick={() =>
          setSections((prev) => [
            ...prev,
            { key: "", title: "", instructions: "" },
          ])
        }
      >
        Adicionar seção
      </Button>
    </fieldset>
  );
}
