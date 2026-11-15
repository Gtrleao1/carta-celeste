"use client";

import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";

// Cookie de sessão do Supabase: `sb-<projeto>-auth-token`, às vezes em pedaços (`.0`, `.1`).
const SESSION_COOKIE = /(?:^|;\s*)sb-[^=;]+-auth-token(?:\.\d+)?=/;

const read = () => SESSION_COOKIE.test(document.cookie);

function subscribe(onChange: () => void) {
  // Cookie não avisa quando muda: relê ao voltar para a aba ou a janela.
  window.addEventListener("focus", onChange);
  document.addEventListener("visibilitychange", onChange);
  return () => {
    window.removeEventListener("focus", onChange);
    document.removeEventListener("visibilitychange", onChange);
  };
}

/**
 * A pessoa parece estar logada? As páginas públicas são estáticas, então isto é
 * lido no navegador, só para escolher textos e botões (a segurança continua no
 * servidor, que confere a sessão de verdade). Olha só se o cookie de sessão
 * existe, sem carregar a biblioteca do Supabase no navegador (~65 KB). Relê a
 * cada troca de página (entrar e sair sempre navegam) e ao voltar para a aba.
 * No servidor e na hidratação vale `false`.
 */
export function useLoggedIn() {
  usePathname(); // faz o componente reler o cookie a cada navegação
  return useSyncExternalStore(subscribe, read, () => false);
}
