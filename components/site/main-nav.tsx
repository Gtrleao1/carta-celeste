"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { AuthLink } from "@/components/site/auth-link";
import { ThemeToggle } from "@/components/site/theme-toggle";
import { useLoggedIn } from "@/components/site/use-logged-in";
import { buttonVariants } from "@/components/ui/button";

const linkClass =
  "text-muted-foreground hover:text-foreground rounded-md px-3 py-2 text-sm";

type Item = { href: string; label: string; button?: boolean; section?: string };

const BLOG: Item = { href: "/blog", label: "Blog", section: "/blog" };

/** Visitante: o menu vende (como funciona e comprar). */
const VISITOR: Item[] = [
  { href: "/#como-funciona", label: "Como funciona" },
  { href: "/comprar", label: "Receber minha carta", button: true },
  BLOG,
];

/** Cliente com sessão: o menu serve à leitura; comprar de novo é "Novo mapa". */
const CUSTOMER: Item[] = [
  { href: "/meus-mapas", label: "Meus mapas", section: "/meus-mapas" },
  BLOG,
  { href: "/comprar", label: "Novo mapa", button: true },
];

/**
 * Menu do site. Muda com a sessão (ver `VISITOR` e `CUSTOMER`) e termina em
 * "Entrar" ou "Minha conta". No celular tudo fica num painel aberto pelo botão
 * "Menu".
 */
export function MainNav() {
  const pathname = usePathname();
  const logged = useLoggedIn();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  // Fecha o painel ao trocar de página e ao apertar Esc.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  useEffect(() => {
    // Trocar de página fecha o painel.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(false);
  }, [pathname]);

  const items = logged ? CUSTOMER : VISITOR;
  const isCurrent = (item: Item) =>
    !!item.section &&
    (pathname === item.section || pathname.startsWith(`${item.section}/`));

  return (
    <nav aria-label="Principal" className="flex items-center gap-1 sm:gap-2">
      {/* Telas médias e grandes */}
      <div className="hidden items-center gap-1 md:flex">
        {items.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            aria-current={isCurrent(item) ? "page" : undefined}
            className={
              item.button
                ? buttonVariants({ size: "lg" }) + " h-10"
                : `${linkClass} ${isCurrent(item) ? "text-foreground font-medium" : ""}`
            }
          >
            {item.label}
          </Link>
        ))}
        <AuthLink />
      </div>

      <ThemeToggle />

      {/* Celular */}
      <button
        type="button"
        className="border-border hover:bg-muted inline-flex h-11 items-center rounded-lg border px-4 text-sm font-medium md:hidden"
        aria-expanded={open}
        aria-controls="menu-movel"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? "Fechar" : "Menu"}
      </button>

      {open && (
        <div
          id="menu-movel"
          className="bg-background border-border absolute inset-x-0 top-16 z-40 grid max-h-[calc(100dvh-4rem)] gap-2 overflow-y-auto border-b px-4 py-4 shadow-lg md:hidden"
        >
          {items.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              onClick={close}
              aria-current={isCurrent(item) ? "page" : undefined}
              className={
                item.button
                  ? buttonVariants({ size: "lg" }) + " h-12 text-base"
                  : "hover:bg-muted rounded-lg px-3 py-3 text-lg"
              }
            >
              {item.label}
            </Link>
          ))}
          <AuthLink className="h-12 text-base" onNavigate={close} stacked />
        </div>
      )}
    </nav>
  );
}
