"use client";

import { useEffect } from "react";

import { spreadAngles, wheelAngle } from "@/lib/chart-wheel/geometry";

type Props = {
  /** Id do elemento que contém o SVG gerado em modo `sky`. */
  targetId: string;
  /** Longitudes por quadro, na ordem dos planetas da roda (calculadas no servidor). */
  frames: number[][];
  /** Por quadro: `[signo do Sol, casa do Sol, signo da Lua, casa da Lua]`. */
  highlights: [number, number, number, number][];
  stepDays: number;
  /** Longitude do Ascendente que fixa a roda. */
  ascendant: number | null;
};

// Duração de um vai e volta do céu (a janela é de 1 dia): leve, ~0,7°/s na Lua.
const PERIOD_S = 40;
// Quadros por segundo: o suficiente para parecer fluido sem pesar na pintura.
const FRAME_MS = 1000 / 30;
const CENTER = 300;

const norm180 = (a: number) => ((((a + 180) % 360) + 360) % 360) - 180;
const r2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Põe o céu da roda em movimento. Não desenha nada: só move planetas que o
 * servidor já desenhou e acende signo e casa do Sol e da Lua. Todos os
 * números vêm prontos do servidor (`computeSkyTimelapse`); aqui há só
 * interpolação e ajuste de posição.
 *
 * Só roda com a roda visível e a aba ativa, depois do carregamento, e nunca
 * com `prefers-reduced-motion`. Mexe no atributo `transform` de ~11 grupos por
 * quadro; nada de camadas novas nem de animação CSS infinita.
 */
export function SkyMotion({
  targetId,
  frames,
  highlights,
  stepDays,
  ascendant,
}: Props) {
  useEffect(() => {
    const root = document.getElementById(targetId);
    if (!root || frames.length < 2) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduced.matches) return;

    const groups = Array.from(
      root.querySelectorAll<SVGGElement>("[data-planet]"),
    );
    if (groups.length !== frames[0].length) return;

    const base = groups.map((g) => Number(g.dataset.angle));
    const glyphs = groups.map((g) => {
      const el = g.querySelector<SVGTextElement>("[data-glyph]");
      return el
        ? { el, x: el.getAttribute("x") ?? "0", y: el.getAttribute("y") ?? "0" }
        : null;
    });
    const signs = Array.from(
      root.querySelectorAll<SVGElement>("[data-hl-sign]"),
    );
    const houses = Array.from(
      root.querySelectorAll<SVGElement>("[data-hl-house]"),
    );

    const totalDays = (frames.length - 1) * stepDays;

    let elapsed = 0; // segundos de movimento acumulados
    let days = 0;
    let lastFrame = -1;
    let lastTime = 0;
    let lastPaint = 0;
    let raf = 0;
    let visible = false;
    let timer: number | undefined;
    let started = false;

    const light = (h: [number, number, number, number]) => {
      for (const el of root.querySelectorAll("[data-on]")) {
        el.removeAttribute("data-on");
      }
      signs[h[0]]?.setAttribute("data-on", "");
      signs[h[2]]?.setAttribute("data-on", "");
      houses[h[1] - 1]?.setAttribute("data-on", "");
      houses[h[3] - 1]?.setAttribute("data-on", "");
    };

    const draw = () => {
      const f = days / stepDays;
      const i = Math.min(Math.floor(f), frames.length - 2);
      const k = f - i;
      const lons = frames[i].map((a, j) => a + (frames[i + 1][j] - a) * k);
      const shown = spreadAngles(lons.map((l) => wheelAngle(l, ascendant)));
      groups.forEach((g, j) => {
        const d = norm180(shown[j] - base[j]);
        g.setAttribute("transform", `rotate(${r2(-d)} ${CENTER} ${CENTER})`);
        const glyph = glyphs[j];
        // O símbolo gira de volta em torno de si mesmo, para ficar em pé.
        glyph?.el.setAttribute(
          "transform",
          `rotate(${r2(d)} ${glyph.x} ${glyph.y})`,
        );
      });
      if (i !== lastFrame) {
        lastFrame = i;
        light(highlights[i]);
      }
    };

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (now - lastPaint < FRAME_MS) return;
      const dt = Math.min(now - lastTime, 100);
      lastTime = now;
      lastPaint = now;
      elapsed += dt / 1000;
      // Vai e volta com suavização nas pontas (cosseno): sem recomeço brusco.
      days =
        (totalDays * (1 - Math.cos((2 * Math.PI * elapsed) / PERIOD_S))) / 2;
      draw();
    };

    const sync = () => {
      const shouldRun = started && visible && !document.hidden;
      if (shouldRun && !raf) {
        lastTime = performance.now();
        raf = requestAnimationFrame(tick);
      } else if (!shouldRun && raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        sync();
      },
      { threshold: 0.05 },
    );

    const begin = () => {
      // Espera a animação de entrada da roda (≈ 1,5 s) terminar.
      timer = window.setTimeout(() => {
        started = true;
        io.observe(root);
        sync();
      }, 1700);
    };
    if (document.readyState === "complete") begin();
    else window.addEventListener("load", begin, { once: true });

    const onVisibility = () => sync();
    const onReduced = () => {
      if (reduced.matches) {
        started = false;
        sync();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    reduced.addEventListener("change", onReduced);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("load", begin);
      document.removeEventListener("visibilitychange", onVisibility);
      reduced.removeEventListener("change", onReduced);
      io.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [targetId, frames, highlights, stepDays, ascendant]);

  return null;
}
