import type { Metadata } from "next";
import Link from "next/link";

import { requireAdmin } from "@/lib/admin/auth";
import { SITE } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Painel admin",
  robots: { index: false, follow: false },
};

const LINKS = [
  { href: "/admin", label: "Pedidos" },
  { href: "/admin/produtos", label: "Produtos" },
  { href: "/admin/configuracoes", label: "Configurações" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();

  return (
    <>
      <header className="border-border bg-background sticky top-0 z-40 border-b">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2">
          <p className="font-heading text-primary text-xl font-semibold">
            {SITE.name}{" "}
            <span className="text-muted-foreground text-sm">admin</span>
          </p>
          <nav aria-label="Admin" className="flex flex-wrap items-center gap-1">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-muted-foreground hover:text-foreground rounded-md px-3 py-2 text-sm"
              >
                {l.label}
              </Link>
            ))}
            <Link
              href="/"
              className="text-muted-foreground hover:text-foreground rounded-md px-3 py-2 text-sm"
            >
              Ver o site
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8">
        {children}
      </main>
    </>
  );
}
