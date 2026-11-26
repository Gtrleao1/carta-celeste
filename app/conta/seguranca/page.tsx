import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { TotpPanel } from "@/components/conta/totp-panel";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { safeNextPath } from "@/lib/auth/redirect";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Verificação em dois passos",
  robots: { index: false },
};

export default async function SegurancaPage({
  searchParams,
}: PageProps<"/conta/seguranca">) {
  const params = await searchParams;
  const next = safeNextPath(
    typeof params.next === "string" ? params.next : null,
  );

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar?next=/conta/seguranca");

  const [{ data: factors }, { data: aal }] = await Promise.all([
    supabase.auth.mfa.listFactors(),
    supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
  ]);
  const verified = factors?.totp?.find((f) => f.status === "verified") ?? null;
  const confirmedNow = aal?.currentLevel === "aal2";

  return (
    <div className="mx-auto flex w-full max-w-md flex-col justify-center gap-6 px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Verificação em dois passos</CardTitle>
          <CardDescription>
            {verified
              ? "Além da senha, você confirma um código do seu celular. Isso protege a sua conta mesmo que alguém descubra a senha."
              : "Cadastre um aplicativo autenticador. Depois, além da senha, você confirma um código do seu celular."}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {verified && confirmedNow ? (
            <>
              <Alert role="status">
                <AlertDescription>
                  A verificação em dois passos está ativa e confirmada nesta
                  sessão.
                </AlertDescription>
              </Alert>
              <Link
                href={next}
                className="text-foreground underline underline-offset-4"
              >
                Continuar
              </Link>
            </>
          ) : (
            <TotpPanel
              mode={verified ? "verify" : "enroll"}
              factorId={verified?.id ?? null}
              next={next}
            />
          )}
        </CardContent>
      </Card>
      <p className="text-muted-foreground text-center text-sm">
        <Link href="/conta" className="underline underline-offset-4">
          Voltar para Minha conta
        </Link>
      </p>
    </div>
  );
}
