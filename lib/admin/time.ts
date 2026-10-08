/**
 * Relógio para páginas de servidor. Fica fora dos componentes porque a regra
 * `react-hooks/purity` recusa `Date.now()` dentro deles; aqui a página é
 * renderizada a cada pedido, então ler a hora é o comportamento desejado.
 */
export const nowMs = () => Date.now();
