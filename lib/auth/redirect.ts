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
