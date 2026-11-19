import type { Focus } from "./focus";

// Os eixos do SVG usam os rótulos que a roda desenha.
const AXIS_LABEL = { asc: "AC", mc: "MC" } as const;

/**
 * Liga `data-on` nos elementos da roda que o foco trata. Só lê e marca o que
 * já está desenhado: nunca move, cria ou apaga elemento, então as posições do
 * mapa natal não mudam. Roda no navegador; não calcula nada nem chama a IA.
 */
export function applyFocus(root: HTMLElement, focus: Focus) {
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
