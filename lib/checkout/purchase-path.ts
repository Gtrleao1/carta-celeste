/**
 * Para onde a compra começada pela home continua depois do cadastro: a tela de
 * compra, já na confirmação. Fica num módulo próprio, sem dependências, para o
 * formulário do navegador poder importá-lo sem levar junto o Zod e os schemas
 * (`start-purchase.ts`, que roda só no servidor).
 */
export const purchasePath = (slug: string) => `/comprar/${slug}?confirmar=1`;
