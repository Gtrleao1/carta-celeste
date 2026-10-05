import type { Metadata } from "next";

import { SignUpForm } from "@/components/auth/sign-up-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { safeNextPath } from "@/lib/auth/redirect";

export const metadata: Metadata = { title: "Criar conta — Carta Celeste" };

export default async function CadastroPage({
  searchParams,
}: PageProps<"/cadastro">) {
  const params = await searchParams;
  const next = safeNextPath(
    typeof params.next === "string" ? params.next : null,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Criar conta</CardTitle>
        <CardDescription>
          Leva menos de um minuto. Seus mapas ficam guardados na sua conta.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <SignUpForm next={next} />
      </CardContent>
    </Card>
  );
}
