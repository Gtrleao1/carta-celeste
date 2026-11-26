"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { signOut } from "@/app/(auth)/actions";
import { useLoggedIn } from "@/components/site/use-logged-in";
import { buttonVariants } from "@/components/ui/button";
import { SITE } from "@/lib/site-config";

const itemClass =
  "hover:bg-accent focus-visible:bg-accent block w-full rounded-lg px-3 py-2.5 text-left text-sm outline-none";

/** Itens de "Minha conta", iguais no menu suspenso e no painel do celular. */
const ACCOUNT_LINKS = [
  { href: "/conta", label: "Meus dados" },
  { href: "/conta#seguranca", label: "Segurança" },
  ...(SITE.contactEmail
    ? [{ href: `mailto:${SITE.contactEmail}`, label: "Ajuda" }]
    : []),
];

/** "Sair": envia o formulário para a Server Action que encerra a sessão. */
function SignOutButton({ className }: { className: string }) {
  return (
    <form action={signOut}>
      <button type="submit" className={className}>
        Sair
      </button>
    </form>
  );
}

/**
 * Menu da conta no cabeçalho (telas grandes): botão "Minha conta" que abre
 * Meus dados, Segurança, Ajuda e Sair. Usa `<details>` (acessível por teclado
 * sem biblioteca); fecha com Esc, ao clicar fora e ao navegar.
 */
function AccountMenu() {
  const ref = useRef<HTMLDetailsElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onClick);
    };
  }, [open]);

  return (
    <details
      ref={ref}
      open={open}
      onToggle={(e) => setOpen(e.currentTarget.open)}
      className="relative"
    >
      <summary
        className={
          buttonVariants({ variant: "outline", size: "lg" }) +
          " cursor-pointer list-none select-none [&::-webkit-details-marker]:hidden"
        }
      >
        Minha conta
        <span aria-hidden="true" className="ml-1 text-xs">
          ▾
        </span>
      </summary>
      <div className="bg-popover text-popover-foreground border-border absolute right-0 z-50 mt-2 grid w-56 gap-0.5 rounded-xl border p-1.5 shadow-lg">
        {ACCOUNT_LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            onClick={() => setOpen(false)}
            className={itemClass}
          >
            {l.label}
          </Link>
        ))}
        <SignOutButton
          className={itemClass + " text-destructive cursor-pointer"}
        />
      </div>
    </details>
  );
}

/**
 * "Entrar" para visitantes; para quem já está logado, o menu da conta (ver
 * `ACCOUNT_LINKS`, mais Sair). O estado de login é lido no navegador (ver
 * `useLoggedIn`) só para escolher o que mostrar; sem login confirmado, "Entrar".
 * `stacked` mostra os itens em lista, para o painel do celular.
 */
export function AuthLink({
  className = "",
  onNavigate,
  stacked = false,
}: {
  className?: string;
  onNavigate?: () => void;
  stacked?: boolean;
}) {
  const logged = useLoggedIn();

  if (!logged) {
    return (
      <Link
        href="/entrar"
        onClick={onNavigate}
        className={
          buttonVariants({ variant: "outline", size: "lg" }) + ` ${className}`
        }
      >
        Entrar
      </Link>
    );
  }

  if (!stacked) return <AccountMenu />;

  const stackItem = "hover:bg-muted rounded-lg px-3 py-3 text-lg";
  return (
    <>
      {ACCOUNT_LINKS.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          onClick={onNavigate}
          className={stackItem}
        >
          {l.label}
        </Link>
      ))}
      <SignOutButton
        className={`${stackItem} text-destructive w-full text-left`}
      />
    </>
  );
}
