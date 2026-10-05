import type { Metadata } from "next";

import { SignInForm } from "@/components/auth/sign-in-form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { safeNextPath } from "@/lib/auth/redirect";

export const metadata: Metadata = { title: "Entrar — Carta Celeste" };

export default async function EntrarPage({
  searchParams,
}: PageProps<"/entrar">) {
  const params = await searchParams;
  const next = safeNextPath(
    typeof params.next === "string" ? params.next : null,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Entrar</CardTitle>
        <CardDescription>Acesse sua conta para ver seus mapas.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {params.erro === "link" && (
          <Alert variant="destructive">
            <AlertDescription>
              O link expirou ou já foi usado. Entre com seu e-mail e senha ou
              peça um novo link.
            </AlertDescription>
          </Alert>
        )}
        <SignInForm next={next} />
      </CardContent>
    </Card>
  );
}
