"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import type { Focus } from "@/lib/reader/focus";

export type ReaderPart = {
  key: string;
  title: string;
  /** Texto da parte, já desenhado no servidor (não vem da IA nesta tela). */
  body: ReactNode;
};

// Os eixos do SVG usam os rótulos que a roda desenha.
const AXIS_LABEL = { asc: "AC", mc: "MC" } as const;

/**
 * Liga `data-on` nos elementos da roda que a parte em foco trata. Só lê e
 * marca o que já está desenhado: nunca move, cria ou apaga elemento, então as
 * posições do mapa natal não mudam.
 */
function applyFocus(root: HTMLElement, focus: Focus) {
  for (const el of root.querySelectorAll("[data-on]")) {
    el.removeAttribute("data-on");
  }
  const empty =
    !focus.planets.length &&
    !focus.signs.length &&
    !focus.houses.length &&
    !focus.aspects.length &&
    !focus.axes.length;
  root.classList.toggle("wheel-focus", !empty);
  if (empty) return;

  const mark = (selector: string, value = "") =>
    root.querySelector(selector)?.setAttribute("data-on", value);
  for (const id of focus.planets) mark(`[data-planet="${id}"]`);
  for (const id of focus.related) mark(`[data-planet="${id}"]`, "rel");
  for (const i of focus.signs) mark(`[data-hl-sign="${i}"]`);
  for (const h of focus.houses) mark(`[data-hl-house="${h}"]`);
  for (const key of focus.aspects) mark(`[data-aspect="${key}"]`);
  for (const axis of focus.axes) mark(`[data-axis="${AXIS_LABEL[axis]}"]`);
}

/**
 * Leitor do mapa: capítulos à esquerda, a roda ao lado (fixa ao rolar) e o
 * texto da parte escolhida. Escolher um capítulo mostra o texto e acende na
 * roda o que ele trata. Tudo acontece no navegador, sobre dados já carregados:
 * nenhuma interação chama a IA nem o servidor.
 */
export function ReportReader({
  parts,
  focusByKey,
  wheel,
}: {
  parts: ReaderPart[];
  focusByKey: Record<string, Focus>;
  /** A roda (SVG) desenhada no servidor, com `interactive`. */
  wheel: ReactNode;
}) {
  const [active, setActive] = useState(0);
  const [visited, setVisited] = useState<Set<number>>(new Set([0]));
  const wheelRef = useRef<HTMLDivElement>(null);
  const current = parts[active];
  const focus = focusByKey[current.key];

  // Endereço com #parte-<chave> abre direto na parte (link que se pode guardar).
  useEffect(() => {
    const i = parts.findIndex(
      (p) => `#parte-${p.key}` === window.location.hash,
    );
    if (i > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActive(i);
      setVisited((v) => new Set(v).add(i));
    }
  }, [parts]);

  useEffect(() => {
    if (wheelRef.current && focus) applyFocus(wheelRef.current, focus);
  }, [focus]);

  function go(i: number) {
    if (i < 0 || i >= parts.length) return;
    setActive(i);
    setVisited((v) => new Set(v).add(i));
    history.replaceState(null, "", `#parte-${parts[i].key}`);
    document
      .getElementById("leitor-texto")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[13rem_minmax(0,26rem)_minmax(0,1fr)] lg:gap-8">
      {/* Capítulos */}
      <nav
        aria-label="Capítulos do mapa"
        className="no-print min-w-0 lg:sticky lg:top-20 lg:self-start"
      >
        <ol className="flex gap-2 overflow-x-auto pb-2 lg:grid lg:gap-0.5 lg:overflow-visible lg:pb-0">
          {parts.map((p, i) => (
            <li key={p.key} className="shrink-0 lg:shrink">
              <button
                type="button"
                onClick={() => go(i)}
                aria-current={i === active ? "true" : undefined}
                className={
                  "focus-visible:ring-ring/60 flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm outline-none focus-visible:ring-3 lg:border-transparent " +
                  (i === active
                    ? "border-primary bg-card text-foreground font-medium"
                    : "border-border text-muted-foreground hover:text-foreground hover:bg-muted/50")
                }
              >
                <span
                  aria-hidden="true"
                  className="text-primary w-4 shrink-0 text-xs"
                >
                  {i === active ? "●" : visited.has(i) ? "✓" : ""}
                </span>
                <span>{p.title}</span>
                {visited.has(i) && i !== active && (
                  <span className="sr-only"> (já lida)</span>
                )}
              </button>
            </li>
          ))}
        </ol>
      </nav>

      {/* Roda fixa ao rolar */}
      <div className="bg-background border-border/60 sticky top-16 z-10 grid justify-items-center gap-2 border-b py-2 lg:top-20 lg:self-start lg:border-0 lg:bg-transparent lg:py-0 print:static">
        <div
          ref={wheelRef}
          className="w-full max-w-[190px] sm:max-w-[260px] lg:max-w-none"
        >
          {wheel}
        </div>
        <p
          aria-live="polite"
          className="text-muted-foreground no-print text-center text-sm"
        >
          <span className="text-foreground font-medium">Em foco: </span>
          {focus?.label ?? "Mapa inteiro"}
        </p>
      </div>

      {/* Texto */}
      <article id="leitor-texto" className="min-w-0 scroll-mt-32">
        {parts.map((p, i) => (
          <section
            key={p.key}
            id={`parte-${p.key}`}
            aria-labelledby={`titulo-${p.key}`}
            className={
              i === active
                ? "grid gap-4"
                : "hidden gap-4 print:grid print:break-before-page"
            }
          >
            <h2
              id={`titulo-${p.key}`}
              className="font-heading text-3xl font-semibold"
            >
              {p.title}
            </h2>
            <div className="text-lg leading-relaxed">{p.body}</div>
          </section>
        ))}

        <div className="no-print border-border mt-8 flex items-center justify-between gap-3 border-t pt-4">
          <button
            type="button"
            onClick={() => go(active - 1)}
            disabled={active === 0}
            className="text-muted-foreground hover:text-foreground rounded-lg px-3 py-2 text-sm underline underline-offset-4 disabled:opacity-40"
          >
            ← Anterior
          </button>
          <span className="text-muted-foreground text-xs">
            {active + 1} de {parts.length}
          </span>
          <button
            type="button"
            onClick={() => go(active + 1)}
            disabled={active === parts.length - 1}
            className="text-foreground rounded-lg px-3 py-2 text-sm underline underline-offset-4 disabled:opacity-40"
          >
            Próxima →
          </button>
        </div>
      </article>
    </div>
  );
}
