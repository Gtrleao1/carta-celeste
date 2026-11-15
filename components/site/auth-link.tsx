"use client";

import Link from "next/link";

import { useLoggedIn } from "@/components/site/use-logged-in";
import { buttonVariants } from "@/components/ui/button";

/**
 * "Entrar" para visitantes e "Meus mapas" para quem já está logado. O estado de
 * login é lido no navegador (ver `useLoggedIn`) só para escolher o rótulo; sem
 * login confirmado, mostra "Entrar".
 */
export function AuthLink({
  className = "",
  onNavigate,
}: {
  className?: string;
  onNavigate?: () => void;
}) {
  const logged = useLoggedIn();

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
