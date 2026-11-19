"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { applyFocus } from "@/lib/reader/apply-focus";
import type { Focus } from "@/lib/reader/focus";

export type PreviewStep = {
  key: string;
  /** Nome do capítulo, como no menu do leitor. */
  title: string;
  focus: Focus;
  /** Começo do texto do capítulo, já desenhado no servidor. */
  body: ReactNode;
};

const STEP_MS = 4200;

/**
 * Prévia animada do leitor do mapa, para a home, com a mesma estrutura do
 * leitor real: capítulos à esquerda, a mandala no meio e o texto à direita.
 * Passa de capítulo em capítulo sozinha: a mandala acende o que o capítulo
 * trata e o texto muda junto. Só liga e desliga `data-on` em elementos já
 * desenhados (as posições nunca mudam) e não chama servidor nem IA. Pausa fora
 * da tela e com a aba oculta; com "reduzir movimento" fica parada e a pessoa
 * escolhe o capítulo.
 */
export function ReaderPreview({
  steps,
  wheel,
}: {
  steps: PreviewStep[];
  /** A roda (SVG) desenhada no servidor, com `interactive`. */
  wheel: ReactNode;
}) {
  const [index, setIndex] = useState(0);
  const [auto, setAuto] = useState(true);
  const rootRef = useRef<HTMLDivElement>(null);
  const wheelRef = useRef<HTMLDivElement>(null);
  const step = steps[index];

  useEffect(() => {
    if (wheelRef.current) applyFocus(wheelRef.current, step.focus);
  }, [step]);

  useEffect(() => {
    if (!auto) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let inView = false;
    const io = new IntersectionObserver(
      ([e]) => {
        inView = e.isIntersecting;
      },
      { threshold: 0.4 },
    );
    if (rootRef.current) io.observe(rootRef.current);
    const timer = window.setInterval(() => {
      if (inView && !document.hidden) {
        setIndex((i) => (i + 1) % steps.length);
      }
    }, STEP_MS);
    return () => {
      window.clearInterval(timer);
      io.disconnect();
    };
  }, [auto, steps.length]);

  return (
    <div
      ref={rootRef}
      className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[13rem_minmax(0,19rem)_minmax(0,1fr)] lg:items-start lg:gap-8"
    >
      {/* Capítulos */}
      <nav aria-label="Capítulos do mapa de exemplo" className="min-w-0">
        <ol className="flex gap-2 overflow-x-auto pb-2 lg:grid lg:gap-0.5 lg:overflow-visible lg:pb-0">
          {steps.map((s, i) => (
            <li key={s.key} className="shrink-0 lg:shrink">
              <button
                type="button"
                onClick={() => {
                  setAuto(false);
                  setIndex(i);
                }}
                aria-current={i === index ? "true" : undefined}
                className={
                  "focus-visible:ring-ring/60 flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm outline-none focus-visible:ring-3 lg:border-transparent " +
                  (i === index
                    ? "border-primary bg-card text-foreground font-medium"
                    : "border-border text-muted-foreground hover:text-foreground hover:bg-muted/50")
                }
              >
                <span
                  aria-hidden="true"
                  className="text-primary w-3 shrink-0 text-xs"
                >
                  {i === index ? "●" : ""}
                </span>
                <span>{s.title}</span>
              </button>
            </li>
          ))}
        </ol>
      </nav>

      {/* Mandala */}
      <div className="grid justify-items-center gap-2">
        <div ref={wheelRef} className="w-full max-w-[19rem]">
          {wheel}
        </div>
        <p
          aria-live="polite"
          className="text-muted-foreground min-h-12 text-center text-sm"
        >
          <span className="text-foreground font-medium">Em foco: </span>
          {step.focus.label}
        </p>
      </div>

      {/* Texto do capítulo (muda junto com a mandala) */}
      <article className="min-w-0">
        {steps.map((s, i) => (
          <section
            key={s.key}
            aria-labelledby={`previa-${s.key}`}
            className={i === index ? "preview-fade grid gap-3" : "hidden"}
          >
            <h3
              id={`previa-${s.key}`}
              className="font-heading text-2xl font-semibold"
            >
              {s.title}
            </h3>
            <div className="relative max-h-[22rem] overflow-hidden text-lg leading-relaxed">
              {s.body}
              <div
                aria-hidden="true"
                className="from-background pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t to-transparent"
              />
            </div>
          </section>
        ))}
      </article>
    </div>
  );
}
