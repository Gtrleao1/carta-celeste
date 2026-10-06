/**
 * Geometria da roda do mapa. Funções puras, sem React, para poderem ser testadas.
 *
 * Convenção: ângulo matemático em graus (0° = direita, sentido anti-horário,
 * como nas rodas astrológicas). O eixo y do SVG cresce para baixo, então
 * `polar` inverte o seno.
 */

const norm = (a: number) => ((a % 360) + 360) % 360;

/**
 * Ângulo de uma longitude eclíptica na roda. Com ascendente, ele fica sempre à
 * esquerda (180°); sem hora (`ascendant = null`), é o 0° de Áries que fica à esquerda.
 * A longitude cresce no sentido anti-horário.
 */
export function wheelAngle(longitude: number, ascendant: number | null) {
  return norm(180 + (longitude - (ascendant ?? 0)));
}

export function polar(cx: number, cy: number, radius: number, angle: number) {
  const rad = (angle * Math.PI) / 180;
  return { x: cx + radius * Math.cos(rad), y: cy - radius * Math.sin(rad) };
}

/**
 * Afasta ângulos que ficariam muito próximos (planetas em conjunção), de modo
 * que dois vizinhos nunca fiquem a menos de `minGap` graus. A ordem circular é
 * preservada e o resultado vem na ordem de entrada.
 */
export function spreadAngles(angles: number[], minGap = 9): number[] {
  const n = angles.length;
  if (n < 2) return angles.map(norm);

  const order = angles
    .map((_, i) => i)
    .sort((a, b) => norm(angles[a]) - norm(angles[b]));
  const d = order.map((i) => norm(angles[i]));

  for (let iter = 0; iter < 500; iter++) {
    let moved = false;
    for (let k = 0; k < n; k++) {
      const next = (k + 1) % n;
      const gap = next === 0 ? d[0] + 360 - d[n - 1] : d[next] - d[k];
      if (gap < minGap - 1e-9) {
        const push = (minGap - gap) / 2;
        d[k] -= push;
        d[next] += push;
        moved = true;
      }
    }
    if (!moved) break;
  }

  const out = new Array<number>(n);
  order.forEach((original, k) => {
    out[original] = norm(d[k]);
  });
  return out;
}

/** Menor distância angular entre dois ângulos, em graus (0 a 180). */
export function angularDistance(a: number, b: number) {
  return Math.abs(norm(a - b + 180) - 180);
}
