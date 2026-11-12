/**
 * Valida o parâmetro `next` de redirecionamento: só aceita caminhos internos
 * (evita "open redirect" para outro site). Volta para /conta se for inválido.
 */
export function safeNextPath(next: string | null | undefined): string {
  if (
    !next ||
    !next.startsWith("/") ||
    next.startsWith("//") ||
    next.includes("\\") ||
    /[\u0000-\u001f]/.test(next)
  ) {
    return "/conta";
  }
  return next;
}

/** O destino é o início da compra de um mapa (`/comprar` ou `/comprar/<produto>`)? */
export const isPurchasePath = (path: string) =>
  path === "/comprar" || path.startsWith("/comprar/");

/**
 * Para onde vai quem acabou de ENTRAR (já tinha conta). Quem veio do botão
 * "Quero meu mapa" cai em "Meus mapas", onde vê os mapas que já tem e pode
 * adicionar outra pessoa. Quem acabou de CRIAR a conta segue direto para a
 * compra (`next`), para informar os dados de nascimento.
 */
export function afterSignInPath(next: string | null | undefined): string {
  const path = safeNextPath(next);
  return isPurchasePath(path) ? "/meus-mapas" : path;
}
