import type { Metadata } from "next";
import Link from "next/link";

import { UpdatePasswordForm } from "@/components/auth/update-password-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Nova senha" };

export default async function RedefinirSenhaPage() {
  // Chegamos aqui pelo link do e-mail, que o /auth/callback já trocou por sessão.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Link expirado</CardTitle>
          <CardDescription>
            Este link já foi usado ou venceu. Peça um novo para criar sua senha.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href="/recuperar-senha"
            className="text-foreground underline underline-offset-4"
          >
            Pedir novo link
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Criar nova senha</CardTitle>
        <CardDescription>Escolha a nova senha da sua conta.</CardDescription>
      </CardHeader>
      <CardContent>
        <UpdatePasswordForm />
      </CardContent>
    </Card>
  );
}
