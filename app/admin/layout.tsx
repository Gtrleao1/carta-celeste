import type { Metadata } from "next";
import Link from "next/link";

import { signOut } from "@/app/(auth)/actions";
import { requireAdmin } from "@/lib/admin/auth";
import { adminMfaRequired } from "@/lib/auth/mfa";
import { SITE } from "@/lib/site-config";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Painel admin",
  robots: { index: false, follow: false },
};

const LINKS = [
  { href: "/admin", label: "Pedidos" },
  { href: "/admin/produtos", label: "Produtos" },
  { href: "/admin/blog", label: "Blog" },
  { href: "/admin/configuracoes", label: "Configurações" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();

  // Lembrete enquanto a verificação em dois passos não estiver ativa e exigida.
  const supabase = await createClient();
  const { data: factors } = await supabase.auth.mfa.listFactors();
  const hasTotp = factors?.totp?.some((f) => f.status === "verified") ?? false;
  const mfaNotice = !hasTotp
    ? "Proteja o painel: ative a verificação em dois passos."
    : !adminMfaRequired()
      ? "Verificação em dois passos cadastrada, mas ainda não é obrigatória. Defina ADMIN_REQUIRE_MFA=true na Vercel (e faça um novo deploy)."
      : null;

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
            <Link
              href="/conta"
              className="text-muted-foreground hover:text-foreground rounded-md px-3 py-2 text-sm"
            >
              Minha conta
            </Link>
            <form action={signOut}>
              <button
                type="submit"
                className="text-destructive hover:bg-muted cursor-pointer rounded-md px-3 py-2 text-sm"
              >
                Sair
              </button>
            </form>
          </nav>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8">
        {mfaNotice && (
          <div
            role="status"
            className="border-primary/40 bg-card flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm"
          >
            <p>{mfaNotice}</p>
            {!hasTotp && (
              <Link
                href="/conta/seguranca?next=%2Fadmin"
                className="text-primary underline underline-offset-4"
              >
                Ativar agora
              </Link>
            )}
          </div>
        )}
        {children}
      </main>
    </>
  );
}
