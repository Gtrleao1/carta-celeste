"use client";

import { useEffect } from "react";

import { SITE } from "@/lib/site-config";

// Roda a cada primeira visita da sessão: se já viu, marca o <html> antes da
// pintura para a abertura nem aparecer (ver `.intro` em globals.css).
const ONCE_PER_SESSION = `try{var s=sessionStorage;if(s.getItem("cc_intro")){document.documentElement.dataset.intro="skip"}else{s.setItem("cc_intro","1")}}catch(e){}`;

const skip = () => {
  document.documentElement.dataset.intro = "skip";
};

/**
 * Abertura curta da home. É só decoração: o conteúdo da página já está
 * carregado por baixo, e a abertura some sozinha em ~1,7 s. Fica fora do
 * alcance de leitores de tela (`aria-hidden`) e pode ser pulada com clique,
 * toque ou Esc.
 */
export function IntroSplash() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") skip();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: ONCE_PER_SESSION }} />
      <div
        className="intro bg-background fixed inset-0 z-[100] grid place-items-center"
        aria-hidden="true"
        onClick={skip}
      >
        <div className="grid justify-items-center gap-6 px-6 text-center">
          <svg viewBox="0 0 120 120" className="size-36 sm:size-44" fill="none">
            <circle
              cx="60"
              cy="60"
              r="56"
              pathLength="1"
              className="intro-ring stroke-primary"
              strokeWidth="1.2"
            />
            <circle
              cx="60"
              cy="60"
              r="40"
              pathLength="1"
              className="intro-ring intro-ring-2 stroke-primary/70"
              strokeWidth="0.8"
            />
            <g className="intro-fade stroke-primary/60" strokeWidth="0.6">
              {Array.from({ length: 12 }, (_, i) => {
                const a = (i * 30 * Math.PI) / 180;
                const f = (n: number) => n.toFixed(2);
                return (
                  <line
                    key={i}
                    x1={f(60 + 40 * Math.cos(a))}
                    y1={f(60 + 40 * Math.sin(a))}
                    x2={f(60 + 56 * Math.cos(a))}
                    y2={f(60 + 56 * Math.sin(a))}
                  />
                );
              })}
            </g>
          </svg>
          <div className="intro-fade grid gap-2">
            <p className="font-heading text-primary text-4xl font-semibold sm:text-5xl">
              {SITE.name}
            </p>
            <p className="text-muted-foreground text-base">
              O céu do instante em que você nasceu.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
