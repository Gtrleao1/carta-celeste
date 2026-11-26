"use client";

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import { applyFocus } from "@/lib/reader/apply-focus";
import { EMPTY_FOCUS, type Focus } from "@/lib/reader/focus";

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

/** Mesmo corte do `lg:` do Tailwind: daqui para cima são três colunas. */
const DESKTOP = "(min-width: 1024px)";

function subscribeDesktop(onChange: () => void) {
  const query = window.matchMedia(DESKTOP);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

const focusRing =
  "focus-visible:ring-ring/60 outline-none focus-visible:ring-3 ";

/*
 * No desktop a letra e o respiro de cada item acompanham a altura da janela,
 * para as 13 partes caberem na tela sem rolar o menu.
 */
const partItem =
  focusRing +
  "flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm " +
  "lg:px-2.5 lg:py-[clamp(0.2rem,0.75vh,0.5rem)] lg:text-[clamp(0.75rem,1.75vh,0.875rem)] lg:leading-tight ";

/**
 * Leitor do mapa. No desktop: menu das partes, texto e a roda (fixos ao rolar);
 * cada parte abre e fecha os subtópicos no clique, e a roda acende o que está
 * sendo lido. No celular: o texto corrido, com o menu das partes no topo e a
 * roda inteira antes do texto. Tudo acontece no navegador, sobre dados já
 * carregados: nenhuma interação chama a IA nem o servidor.
 */
export function ReportReader({
  parts,
  focusByKey,
  wheel,
  actions,
}: {
  parts: ReaderPart[];
  focusByKey: Record<string, Focus>;
  /** A roda (SVG) desenhada no servidor, com `interactive`. */
  wheel: ReactNode;
  /** Ações do mapa (salvar em PDF): abaixo do menu; no celular, no fim do texto. */
  actions?: ReactNode;
}) {
  const [active, setActive] = useState(0);
  /** A parte ativa está com os subtópicos abertos no menu? */
  const [open, setOpen] = useState(false);
  const [activeSub, setActiveSub] = useState<string | null>(null);
  const [visited, setVisited] = useState<Set<number>>(new Set([0]));
  const desktop = useSyncExternalStore(
    subscribeDesktop,
    () => window.matchMedia(DESKTOP).matches,
    () => true,
  );
  const wheelRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLOListElement>(null);
  const current = parts[active];
  const sub = current.subs.find((s) => s.id === activeSub) ?? null;
  // Foco: o do subtópico em leitura; sem subtópico, o da parte inteira. No
  // celular a roda fica antes do texto e aparece sempre inteira.
  const focus = desktop ? (sub?.focus ?? focusByKey[current.key]) : EMPTY_FOCUS;

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
    setOpen(subId !== null);
    setVisited((v) => new Set(v).add(i));
    requestAnimationFrame(() =>
      document
        .getElementById(subId ?? `parte-${parts[i].key}`)
        ?.scrollIntoView({ block: "start" }),
    );
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

  // Celular (texto corrido): a rolagem marca no menu a parte que está sendo lida.
  useEffect(() => {
    if (desktop) return;
    const sections = parts
      .map((p) => document.getElementById(`parte-${p.key}`))
      .filter((el): el is HTMLElement => el !== null);
    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries.filter((e) => e.isIntersecting).at(-1);
        if (!hit) return;
        const i = parts.findIndex((p) => `parte-${p.key}` === hit.target.id);
        if (i < 0) return;
        setActive(i);
        setVisited((v) => new Set(v).add(i));
      },
      { rootMargin: "-130px 0px -60% 0px" },
    );
    sections.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, [desktop, parts]);

  // Celular: o item ativo do menu fica à vista na faixa (sem rolar a página).
  useEffect(() => {
    if (desktop) return;
    const list = listRef.current;
    const item = list?.children[active] as HTMLElement | undefined;
    if (!list || !item) return;
    // Sem animação: uma rolagem suave aqui é interrompida pela rolagem da página.
    list.scrollTo({ left: item.offsetLeft - 16 });
  }, [active, desktop]);

  function goPart(i: number) {
    if (i < 0 || i >= parts.length) return;
    setActive(i);
    setActiveSub(null);
    setVisited((v) => new Set(v).add(i));
    history.replaceState(null, "", `#parte-${parts[i].key}`);
    // Desktop: o texto troca no lugar. Celular: vai até a parte no texto corrido.
    document
      .getElementById(desktop ? "leitor-texto" : `parte-${parts[i].key}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /** Clique no menu: abre a parte; clicando de novo nela, contrai ou expande. */
  function toggleFromMenu(i: number) {
    if (desktop && i === active) {
      setOpen((o) => !o);
      return;
    }
    setOpen(true);
    goPart(i);
  }

  function goSub(partIndex: number, subId: string) {
    setActiveSub(subId);
    history.replaceState(null, "", `#${subId}`);
    // Se a parte acabou de abrir, o subtítulo só existe depois da pintura.
    requestAnimationFrame(() =>
      document
        .getElementById(subId)
        ?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  }

  return (
    // `flex` no celular: só assim o menu fica preso no topo ao rolar o texto.
    <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[12rem_minmax(0,1fr)_18rem] xl:grid-cols-[13rem_minmax(0,1fr)_22rem] xl:gap-8">
      {/* Partes e subtópicos; no desktop, as ações ficam logo abaixo. */}
      <div className="no-print bg-background border-border/60 sticky top-16 z-20 min-w-0 border-b py-2 lg:top-20 lg:flex lg:max-h-[calc(100dvh-5.5rem)] lg:flex-col lg:gap-3 lg:self-start lg:border-0 lg:bg-transparent lg:py-0">
        <nav
          aria-label="Partes do mapa"
          className="min-w-0 lg:min-h-0 lg:overflow-y-auto"
        >
          <ol
            ref={listRef}
            className="relative flex [scrollbar-width:none] gap-2 overflow-x-auto lg:grid lg:gap-px lg:overflow-visible"
          >
            {parts.map((p, i) => {
              const expanded = i === active && open && p.subs.length > 0;
              return (
                <li key={p.key} className="shrink-0 lg:shrink">
                  <button
                    type="button"
                    onClick={() => toggleFromMenu(i)}
                    aria-current={i === active ? "true" : undefined}
                    aria-expanded={
                      desktop && p.subs.length ? expanded : undefined
                    }
                    className={
                      partItem +
                      "lg:border-transparent " +
                      (i === active
                        ? "border-primary bg-card text-foreground font-medium"
                        : "border-border text-muted-foreground hover:text-foreground hover:bg-muted/50")
                    }
                  >
                    <span
                      aria-hidden="true"
                      className="text-primary w-3 shrink-0 text-xs"
                    >
                      {i === active ? "●" : visited.has(i) ? "✓" : ""}
                    </span>
                    <span className="whitespace-nowrap lg:flex-1 lg:whitespace-normal">
                      {p.title}
                    </span>
                    {visited.has(i) && i !== active && (
                      <span className="sr-only"> (já lida)</span>
                    )}
                    {p.subs.length > 0 && (
                      <span
                        aria-hidden="true"
                        className={
                          "text-muted-foreground hidden shrink-0 transition-transform lg:inline " +
                          (expanded ? "rotate-90" : "")
                        }
                      >
                        ›
                      </span>
                    )}
                  </button>
                  {expanded && (
                    <ul
                      className="mt-0.5 mb-1 ml-4 hidden gap-px border-l pl-1 lg:grid"
                      aria-label={`Subtópicos de ${p.title}`}
                    >
                      {p.subs.map((s) => (
                        <li key={s.id}>
                          <button
                            type="button"
                            onClick={() => goSub(i, s.id)}
                            aria-current={
                              s.id === activeSub ? "true" : undefined
                            }
                            className={
                              focusRing +
                              "w-full rounded-md border px-2 py-1 text-left text-xs leading-snug " +
                              (s.id === activeSub
                                ? "border-primary/60 bg-card text-foreground"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted/50 border-transparent")
                            }
                          >
                            {s.label}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
        {actions && <div className="hidden shrink-0 lg:block">{actions}</div>}
      </div>

      {/* Roda: no desktop, fixa à direita; no celular, inteira antes do texto. */}
      <div className="grid justify-items-center gap-2 lg:sticky lg:top-20 lg:order-3 lg:self-start print:static">
        <div ref={wheelRef} className="w-full max-w-[20rem] lg:max-w-none">
          {wheel}
        </div>
        <p
          aria-live="polite"
          className="text-muted-foreground no-print hidden text-center text-sm lg:block"
        >
          <span className="text-foreground font-medium">Em foco: </span>
          {focus?.label ?? "Mapa inteiro"}
        </p>
      </div>

      {/* Texto: corrido no celular; uma parte por vez no desktop. */}
      <article
        id="leitor-texto"
        className="grid min-w-0 scroll-mt-20 gap-12 lg:order-2 lg:block"
      >
        {parts.map((p, i) => (
          <section
            key={p.key}
            id={`parte-${p.key}`}
            aria-labelledby={`titulo-${p.key}`}
            className={
              "grid scroll-mt-32 content-start gap-4 lg:scroll-mt-24 " +
              (i === active ? "" : "lg:hidden print:grid!") +
              " print:break-before-page"
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

        <div className="no-print border-border mt-8 hidden items-center justify-between gap-3 border-t pt-4 lg:flex">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              goPart(active - 1);
            }}
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
            onClick={() => {
              setOpen(false);
              goPart(active + 1);
            }}
            disabled={active === parts.length - 1}
            className="text-foreground rounded-lg px-3 py-2 text-sm underline underline-offset-4 disabled:opacity-40"
          >
            Próxima →
          </button>
        </div>

        {actions && (
          <div className="no-print border-border border-t pt-6 lg:hidden">
            {actions}
          </div>
        )}
      </article>
    </div>
  );
}
