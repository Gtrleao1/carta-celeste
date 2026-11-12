"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { AuthLink } from "@/components/site/auth-link";
import { ThemeToggle } from "@/components/site/theme-toggle";
import { buttonVariants } from "@/components/ui/button";

const linkClass =
  "text-muted-foreground hover:text-foreground rounded-md px-3 py-2 text-sm";

/**
 * Menu do site: Como funciona, Receber minha carta, Blog e Entrar. No celular
 * os quatro ficam num painel aberto pelo botão "Menu".
 */
export function MainNav() {
  const pathname = usePathname();
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

  const inBlog = pathname === "/blog" || pathname.startsWith("/blog/");

  return (
    <nav aria-label="Principal" className="flex items-center gap-1 sm:gap-2">
      {/* Telas médias e grandes */}
      <div className="hidden items-center gap-1 md:flex">
        <Link href="/#como-funciona" className={linkClass}>
          Como funciona
        </Link>
        <Link
          href="/comprar"
          className={buttonVariants({ size: "lg" }) + " h-10"}
        >
          Receber minha carta
        </Link>
        <Link
          href="/blog"
          aria-current={inBlog ? "page" : undefined}
          className={`${linkClass} ${inBlog ? "text-foreground font-medium" : ""}`}
        >
          Blog
        </Link>
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
          className="bg-background border-border absolute inset-x-0 top-16 z-40 grid gap-2 border-b px-4 py-4 shadow-lg md:hidden"
        >
          <Link
            href="/#como-funciona"
            onClick={close}
            className="hover:bg-muted rounded-lg px-3 py-3 text-lg"
          >
            Como funciona
          </Link>
          <Link
            href="/comprar"
            onClick={close}
            className={buttonVariants({ size: "lg" }) + " h-12 text-base"}
          >
            Receber minha carta
          </Link>
          <Link
            href="/blog"
            onClick={close}
            aria-current={inBlog ? "page" : undefined}
            className="hover:bg-muted rounded-lg px-3 py-3 text-lg"
          >
            Blog
          </Link>
          <AuthLink className="h-12 text-base" onNavigate={close} />
        </div>
      )}
    </nav>
  );
}
