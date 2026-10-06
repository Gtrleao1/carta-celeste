"use client";

import { useEffect, useId, useRef, useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type CityOption = {
  id: number;
  label: string;
  latitude: number;
  longitude: number;
  timezone: string;
};

/**
 * Busca de cidade com autocompletar (padrão ARIA "combobox"): a partir de 2
 * letras, sem acento e sem diferenciar maiúsculas. Escolher uma opção preenche
 * os campos ocultos `city_mode` e `city_id`; o servidor busca as coordenadas e
 * o fuso no banco.
 */
export function CityPicker({
  error,
  onManual,
}: {
  error?: string;
  /** Abre os campos manuais ("Não encontrei minha cidade"). */
  onManual: () => void;
}) {
  const uid = useId();
  const listId = `${uid}-lista`;
  const statusId = `${uid}-status`;
  const [text, setText] = useState("");
  const [selected, setSelected] = useState<CityOption | null>(null);
  const [options, setOptions] = useState<CityOption[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [status, setStatus] = useState<"idle" | "loading" | "empty" | "error">(
    "idle",
  );
  const abort = useRef<AbortController | null>(null);

  // Só busca com 2 letras ou mais e enquanto nenhuma cidade estiver escolhida.
  const searching = !selected && text.trim().length >= 2;
  const shownOptions = searching ? options : [];
  const shownStatus = searching ? status : "idle";

  useEffect(() => {
    if (!searching) return;
    const timer = setTimeout(async () => {
      setStatus("loading");
      abort.current?.abort();
      const controller = new AbortController();
      abort.current = controller;
      try {
        const res = await fetch(
          `/api/cidades?q=${encodeURIComponent(text.trim())}`,
          { signal: controller.signal },
        );
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as { cities: CityOption[] };
        setOptions(data.cities);
        setStatus(data.cities.length ? "idle" : "empty");
        setActive(data.cities.length ? 0 : -1);
        setOpen(true);
      } catch (e) {
        if ((e as Error).name !== "AbortError") setStatus("error");
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [text, searching]);

  function choose(option: CityOption) {
    setSelected(option);
    setText(option.label);
    setOpen(false);
    setOptions([]);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" && shownOptions.length) {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (i + 1) % shownOptions.length);
    } else if (e.key === "ArrowUp" && shownOptions.length) {
      e.preventDefault();
      setActive((i) => (i <= 0 ? shownOptions.length - 1 : i - 1));
    } else if (
      e.key === "Enter" &&
      open &&
      active >= 0 &&
      shownOptions[active]
    ) {
      e.preventDefault(); // não envia o formulário ao escolher
      choose(shownOptions[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const message =
    shownStatus === "loading"
      ? "Buscando cidades…"
      : shownStatus === "empty"
        ? "Nenhuma cidade encontrada. Confira a grafia ou use “Não encontrei minha cidade”."
        : shownStatus === "error"
          ? "Não foi possível buscar agora. Tente de novo."
          : open && shownOptions.length
            ? `${shownOptions.length} cidades encontradas. Use as setas para escolher.`
            : "";

  return (
    <div className="grid gap-1.5">
      <input type="hidden" name="city_mode" value="db" />
      <input type="hidden" name="city_id" value={selected?.id ?? ""} />
      <Label htmlFor={`${uid}-cidade`}>Cidade de nascimento</Label>
      <div className="relative">
        <Input
          id={`${uid}-cidade`}
          role="combobox"
          aria-expanded={open && shownOptions.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            open && active >= 0 ? `${uid}-op-${active}` : undefined
          }
          aria-describedby={statusId}
          aria-invalid={error ? true : undefined}
          autoComplete="off"
          className="h-11 text-base"
          placeholder="Digite pelo menos 2 letras"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setSelected(null); // digitar de novo invalida a escolha anterior
            setOpen(true);
          }}
          onKeyDown={onKeyDown}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onFocus={() => shownOptions.length && setOpen(true)}
        />
        {open && shownOptions.length > 0 && (
          <ul
            id={listId}
            role="listbox"
            aria-label="Cidades encontradas"
            className="bg-popover text-popover-foreground border-border absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-lg border shadow-lg"
          >
            {shownOptions.map((o, i) => (
              <li
                key={o.id}
                id={`${uid}-op-${i}`}
                role="option"
                aria-selected={i === active}
                className={
                  "cursor-pointer px-3 py-2.5 text-base " +
                  (i === active ? "bg-accent" : "")
                }
                onMouseDown={(e) => {
                  e.preventDefault(); // evita perder o foco antes do clique
                  choose(o);
                }}
                onMouseEnter={() => setActive(i)}
              >
                {o.label}
              </li>
            ))}
          </ul>
        )}
      </div>
      <p
        id={statusId}
        aria-live="polite"
        className="text-muted-foreground min-h-4 text-xs"
      >
        {message}
      </p>
      {error && <p className="text-destructive text-sm">{error}</p>}
      <button
        type="button"
        onClick={onManual}
        className="text-muted-foreground hover:text-foreground w-fit text-sm underline underline-offset-4"
      >
        Não encontrei minha cidade
      </button>
    </div>
  );
}
