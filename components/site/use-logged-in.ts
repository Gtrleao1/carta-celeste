"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useEffect, useState } from "react";

/**
 * A pessoa está logada? As páginas públicas são estáticas, então o estado de
 * login é lido aqui, no navegador, só para escolher textos e botões (a
 * segurança continua no servidor). Começa `false` e acompanha entradas e saídas.
 */
export function useLoggedIn() {
  const [logged, setLogged] = useState(false);

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return;
    const supabase = createBrowserClient(url, key);
    let active = true;
    // getSession só lê o cookie (sem rede): basta para escolher o texto do botão.
    void supabase.auth.getSession().then(({ data }) => {
      if (active) setLogged(Boolean(data.session));
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (active) setLogged(Boolean(session));
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return logged;
}
