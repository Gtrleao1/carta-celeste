import "server-only";

import { createHash } from "node:crypto";

/**
 * Limites de tentativas de login (`withinRateLimit`), em duas chaves:
 * - por IP e e-mail: trava tentativa de adivinhar a senha de UMA conta;
 * - por IP: trava quem testa muitas contas de uma vez.
 *
 * Por que não só por e-mail: um atacante poderia travar o login de qualquer
 * cliente só repetindo o e-mail dele. Com o IP junto, ele só trava a si mesmo.
 *
 * O e-mail entra na chave como hash (SHA-256 truncado): a tabela de limites
 * nunca guarda e-mail de ninguém (privacidade, LGPD).
 */

export const LOGIN_WINDOW_SECONDS = 600;
export const LOGIN_MAX_PER_ACCOUNT = 8;
export const LOGIN_MAX_PER_IP = 30;

export function loginRateKeys(ip: string, email: string) {
  const hash = createHash("sha256")
    .update(email.trim().toLowerCase())
    .digest("hex")
    .slice(0, 24);
  return {
    account: {
      key: `login:${ip}:${hash}`,
      max: LOGIN_MAX_PER_ACCOUNT,
      windowSeconds: LOGIN_WINDOW_SECONDS,
    },
    ip: {
      key: `login-ip:${ip}`,
      max: LOGIN_MAX_PER_IP,
      windowSeconds: LOGIN_WINDOW_SECONDS,
    },
  };
}
