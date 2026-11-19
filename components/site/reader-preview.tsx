"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { applyFocus } from "@/lib/reader/apply-focus";
import type { Focus } from "@/lib/reader/focus";

export type PreviewStep = {
  /** Nome do capítulo, como no menu do leitor. */
  title: string;
  focus: Focus;
};

const STEP_MS = 3200;

/**
 * Prévia animada do leitor do mapa, para a home: a mandala de um mapa de
 * exemplo acende o que cada capítulo trata, passando de um em um. Só liga e
 * desliga `data-on` em elementos já desenhados (as posições nunca mudam) e
 * não chama servidor nem IA. Pausa fora da tela e com a aba oculta; com
 * "reduzir movimento" fica parada e a pessoa escolhe o capítulo.
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
      className="grid items-center gap-8 md:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]"
    >
      <div ref={wheelRef} className="mx-auto w-full max-w-[22rem]">
        {wheel}
      </div>
      <div className="grid gap-4">
        <ul
          aria-label="Capítulos do mapa de exemplo"
          className="flex flex-wrap gap-2"
        >
          {steps.map((s, i) => (
            <li key={s.title}>
              <button
                type="button"
                onClick={() => {
                  setAuto(false);
                  setIndex(i);
                }}
                aria-pressed={i === index}
                className={
                  "focus-visible:ring-ring/60 rounded-full border px-4 py-2 text-sm outline-none focus-visible:ring-3 " +
                  (i === index
                    ? "border-primary bg-card text-foreground font-medium"
                    : "border-border text-muted-foreground hover:text-foreground hover:bg-muted/50")
                }
              >
                {s.title}
              </button>
            </li>
          ))}
        </ul>
        <p aria-live="polite" className="text-muted-foreground min-h-12">
          <span className="text-foreground font-medium">Em foco: </span>
          {step.focus.label}
        </p>
      </div>
    </div>
  );
}
