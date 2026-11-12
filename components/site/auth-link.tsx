"use client";

import { createBrowserClient } from "@supabase/ssr";
import Link from "next/link";
import { useEffect, useState } from "react";

import { buttonVariants } from "@/components/ui/button";

/**
 * "Entrar" para visitantes e "Meus mapas" para quem já está logado. As páginas
 * públicas são estáticas, então o estado de login é lido aqui, no navegador, só
 * para escolher o rótulo (a segurança continua no servidor). Sem login confirmado,
 * mostra "Entrar".
 */
export function AuthLink({
  className = "",
  onNavigate,
}: {
  className?: string;
  onNavigate?: () => void;
}) {
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

  return (
    <Link
      href={logged ? "/meus-mapas" : "/entrar"}
      onClick={onNavigate}
      className={
        buttonVariants({ variant: "outline", size: "lg" }) + ` ${className}`
      }
    >
      {logged ? "Meus mapas" : "Entrar"}
    </Link>
  );
}
