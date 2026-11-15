import {
  CONSTELLATIONS,
  artFile,
  type ArtVariant,
  type Constellation,
} from "./data";

/**
 * Gera os SVGs das constelações. Eles viram máscara CSS (`.sky-art`): só o canal
 * de transparência importa, e a cor vem do tema. Por isso tudo é branco, e a
 * intensidade de cada elemento é a sua opacidade.
 *
 * Os arquivos ficam em `public/constellations/` (gerados por
 * `npm run build:constellations`); um teste confere que não estão defasados.
 */

const f = (n: number) => Number(n.toFixed(2));

/** Gerador pseudoaleatório com semente: o mesmo desenho sai sempre igual. */
function rng(seed: string) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Estrela de quatro pontas (brilho de câmera), centrada em (x, y). */
const sparkle = (x: number, y: number, r: number) =>
  `M ${f(x - r)} ${f(y)} L ${f(x + r)} ${f(y)} M ${f(x)} ${f(y - r)} L ${f(x)} ${f(y + r)}`;

/** Curva suave (Catmull-Rom → Bézier) passando pelos pontos. */
function smoothPath(points: [number, number][]) {
  if (points.length < 2) return "";
  const p = (i: number) => points[Math.max(0, Math.min(points.length - 1, i))];
  let d = `M ${f(points[0][0])} ${f(points[0][1])}`;
  for (let i = 0; i < points.length - 1; i++) {
    const [p0, p1, p2, p3] = [p(i - 1), p(i), p(i + 1), p(i + 2)];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C ${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d;
}

const WHITE = 'fill="#fff"';
const STROKE = 'fill="none" stroke="#fff" stroke-linecap="round"';

export function constellationSvg(c: Constellation, variant: ArtVariant) {
  const abstract = variant === "abstrata";
  const rand = rng(c.slug + variant);
  const out: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">`,
  ];

  if (abstract) {
    // Anéis de órbita e marcas de grau em volta, como num mapa celeste antigo.
    const ticks: string[] = [];
    for (let i = 0; i < 36; i++) {
      const a = (i * 10 * Math.PI) / 180;
      const [r1, r2] = i % 3 === 0 ? [47, 44.5] : [47, 45.8];
      ticks.push(
        `M ${f(50 + r1 * Math.cos(a))} ${f(50 + r1 * Math.sin(a))} L ${f(50 + r2 * Math.cos(a))} ${f(50 + r2 * Math.sin(a))}`,
      );
    }
    out.push(
      `<circle cx="50" cy="50" r="47" ${STROKE} stroke-width=".25" stroke-opacity=".45"/>`,
      `<circle cx="50" cy="50" r="33" ${STROKE} stroke-width=".2" stroke-opacity=".3" stroke-dasharray=".6 1.8"/>`,
      `<path d="${ticks.join(" ")}" ${STROKE} stroke-width=".3" stroke-opacity=".5"/>`,
    );

    // Fita luminosa que percorre a constelação: o "desenho" abstrato dela.
    const pts = c.ribbon.map(
      (i) => [c.stars[i][0], c.stars[i][1]] as [number, number],
    );
    const d = smoothPath(pts);
    out.push(
      `<path d="${d}" ${STROKE} stroke-width="10" stroke-opacity=".05" stroke-linejoin="round"/>`,
      `<path d="${d}" ${STROKE} stroke-width="5" stroke-opacity=".1" stroke-linejoin="round"/>`,
      `<path d="${d}" ${STROKE} stroke-width=".45" stroke-opacity=".7" stroke-linejoin="round"/>`,
    );
  }

  // Estrelas de fundo, bem fracas.
  const dust: string[] = [];
  for (let i = 0; i < (abstract ? 14 : 10); i++) {
    dust.push(
      `<circle cx="${f(4 + rand() * 92)}" cy="${f(4 + rand() * 92)}" r="${f(0.25 + rand() * 0.3)}" fill-opacity="${f(0.3 + rand() * 0.3)}" ${WHITE}/>`,
    );
  }
  out.push(...dust);

  // Linhas da constelação (na versão abstrata, mais discretas).
  const lines = c.lines
    .map(([a, b]) => {
      const [sa, sb] = [c.stars[a], c.stars[b]];
      return `M ${sa[0]} ${sa[1]} L ${sb[0]} ${sb[1]}`;
    })
    .join(" ");
  out.push(
    `<path d="${lines}" ${STROKE} stroke-width="${abstract ? 0.25 : 0.5}" stroke-opacity="${abstract ? 0.4 : 0.6}"/>`,
  );

  // Estrelas: halo suave, miolo e, nas mais brilhantes, brilho de quatro pontas.
  for (const [x, y, b] of c.stars) {
    const r = 0.6 + b * 0.5;
    if (b >= 3 || abstract) {
      out.push(
        `<circle cx="${x}" cy="${y}" r="${f(r * (abstract ? 5 : 3.2))}" fill-opacity="${abstract ? 0.07 : 0.1}" ${WHITE}/>`,
        `<circle cx="${x}" cy="${y}" r="${f(r * 2.2)}" fill-opacity=".16" ${WHITE}/>`,
      );
    }
    out.push(
      `<circle cx="${x}" cy="${y}" r="${f(r)}" fill-opacity=".95" ${WHITE}/>`,
    );
    if (b >= 3) {
      out.push(
        `<path d="${sparkle(x, y, r * (b === 4 ? 5 : 3.4))}" ${STROKE} stroke-width=".3" stroke-opacity=".8"/>`,
      );
    }
  }

  out.push(`</svg>`);
  return out.join("\n");
}

/** Campo de estrelas que se repete (fundo fixo atrás da página). */
export function starfieldSvg() {
  const rand = rng("estrelas");
  const out: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">`,
  ];
  for (let i = 0; i < 46; i++) {
    const x = f(rand() * 100);
    const y = f(rand() * 100);
    const r = f(0.18 + rand() * rand() * 0.7);
    out.push(
      `<circle cx="${x}" cy="${y}" r="${r}" fill-opacity="${f(0.35 + rand() * 0.6)}" ${WHITE}/>`,
    );
  }
  for (let i = 0; i < 4; i++) {
    const x = 8 + rand() * 84;
    const y = 8 + rand() * 84;
    out.push(
      `<path d="${sparkle(x, y, 1.6)}" ${STROKE} stroke-width=".22" stroke-opacity=".85"/>`,
      `<circle cx="${f(x)}" cy="${f(y)}" r=".42" fill-opacity=".95" ${WHITE}/>`,
    );
  }
  out.push(`</svg>`);
  return out.join("\n");
}

/** Todos os arquivos que devem existir em `public/constellations/`. */
export function allArtFiles(): Record<string, string> {
  const files: Record<string, string> = {};
  for (const c of CONSTELLATIONS) {
    for (const variant of ["linhas", "abstrata"] as const) {
      files[`${artFile(c.slug, variant)}.svg`] = constellationSvg(c, variant);
    }
  }
  files["estrelas.svg"] = starfieldSvg();
  return files;
}
