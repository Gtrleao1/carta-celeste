"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { applyFocus } from "@/lib/reader/apply-focus";
import type { Focus } from "@/lib/reader/focus";

export type ReaderSub = {
  /** `id` do subtítulo no texto. */
  id: string;
  /** Nome curto para o menu. */
  label: string;
  focus: Focus;
};

export type ReaderPart = {
  key: string;
  title: string;
  /** Texto da parte, já desenhado no servidor (não vem da IA nesta tela). */
  body: ReactNode;
  /** Subtópicos (`###`) da parte, na ordem do texto. */
  subs: ReaderSub[];
};

const itemBase =
  "focus-visible:ring-ring/60 flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm outline-none focus-visible:ring-3 ";

/**
 * Leitor do mapa: capítulos (com os subtópicos) à esquerda, a roda ao lado
 * (fixa ao rolar) e o texto. Escolher um capítulo ou um subtópico mostra o
 * texto e acende na roda o que ele trata; rolar o texto também move o foco
 * para o subtópico que está sendo lido. Tudo acontece no navegador, sobre
 * dados já carregados: nenhuma interação chama a IA nem o servidor.
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
  const [activeSub, setActiveSub] = useState<string | null>(null);
  const [visited, setVisited] = useState<Set<number>>(new Set([0]));
  const wheelRef = useRef<HTMLDivElement>(null);
  const current = parts[active];
  const sub = current.subs.find((s) => s.id === activeSub) ?? null;
  // Foco: o do subtópico em leitura; sem subtópico, o da parte inteira.
  const focus = sub?.focus ?? focusByKey[current.key];

  // Endereço com #parte-<chave> (ou o de um subtópico) abre direto no lugar.
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) return;
    const i = parts.findIndex(
      (p) =>
        `#parte-${p.key}` === hash || p.subs.some((s) => `#${s.id}` === hash),
    );
    if (i < 0) return;
    const subId = parts[i].subs.find((s) => `#${s.id}` === hash)?.id ?? null;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActive(i);
    setActiveSub(subId);
    setVisited((v) => new Set(v).add(i));
    if (subId) {
      requestAnimationFrame(() =>
        document.getElementById(subId)?.scrollIntoView({ block: "start" }),
      );
    }
  }, [parts]);

  useEffect(() => {
    if (wheelRef.current && focus) applyFocus(wheelRef.current, focus);
  }, [focus]);

  // Rolagem: o subtópico que está sendo lido passa a ser o foco da roda.
  useEffect(() => {
    const headings = current.subs
      .map((s) => document.getElementById(s.id))
      .filter((el): el is HTMLElement => el !== null);
    if (!headings.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        // O que cruzou a faixa de leitura (logo abaixo do topo) vira o ativo.
        const hit = entries.filter((e) => e.isIntersecting).at(-1);
        if (hit) setActiveSub(hit.target.id);
      },
      { rootMargin: "-120px 0px -65% 0px" },
    );
    headings.forEach((h) => io.observe(h));
    return () => io.disconnect();
  }, [current]);

  function goPart(i: number) {
    if (i < 0 || i >= parts.length) return;
    setActive(i);
    setActiveSub(null);
    setVisited((v) => new Set(v).add(i));
    history.replaceState(null, "", `#parte-${parts[i].key}`);
    document
      .getElementById("leitor-texto")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function goSub(partIndex: number, subId: string) {
    if (partIndex !== active) {
      setActive(partIndex);
      setVisited((v) => new Set(v).add(partIndex));
    }
    setActiveSub(subId);
    history.replaceState(null, "", `#${subId}`);
    // Se a parte acabou de abrir, o subtítulo só existe depois da pintura.
    requestAnimationFrame(() =>
      document
        .getElementById(subId)
        ?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  }

  const subList = (p: ReaderPart, i: number, className: string) => (
    <ul className={className} aria-label={`Subtópicos de ${p.title}`}>
      {p.subs.map((s) => (
        <li key={s.id} className="shrink-0 lg:shrink">
          <button
            type="button"
            onClick={() => goSub(i, s.id)}
            aria-current={s.id === activeSub ? "true" : undefined}
            className={
              itemBase +
              "py-1.5 text-xs " +
              (s.id === activeSub
                ? "border-primary/60 bg-card text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50 border-transparent lg:border-transparent")
            }
          >
            <span aria-hidden="true" className="text-primary w-3 shrink-0">
              {s.id === activeSub ? "›" : ""}
            </span>
            <span>{s.label}</span>
          </button>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[14rem_minmax(0,26rem)_minmax(0,1fr)] lg:gap-8">
      {/* Capítulos e subtópicos */}
      <nav
        aria-label="Capítulos do mapa"
        className="no-print min-w-0 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:self-start lg:overflow-y-auto"
      >
        <ol className="flex gap-2 overflow-x-auto pb-2 lg:grid lg:gap-0.5 lg:overflow-visible lg:pb-0">
          {parts.map((p, i) => (
            <li key={p.key} className="shrink-0 lg:shrink">
              <button
                type="button"
                onClick={() => goPart(i)}
                aria-current={i === active && !activeSub ? "true" : undefined}
                aria-expanded={p.subs.length ? i === active : undefined}
                className={
                  itemBase +
                  "lg:border-transparent " +
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
              {/* Telas grandes: subtópicos logo abaixo do capítulo aberto */}
              {i === active &&
                p.subs.length > 0 &&
                subList(
                  p,
                  i,
                  "mt-0.5 mb-1.5 ml-4 hidden gap-0.5 border-l pl-1 lg:grid",
                )}
            </li>
          ))}
        </ol>
        {/* Celular e tablet: subtópicos do capítulo aberto numa faixa abaixo */}
        {current.subs.length > 0 &&
          subList(
            current,
            active,
            "mt-1 flex gap-2 overflow-x-auto pb-2 lg:hidden",
          )}
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
            onClick={() => goPart(active - 1)}
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
            onClick={() => goPart(active + 1)}
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
