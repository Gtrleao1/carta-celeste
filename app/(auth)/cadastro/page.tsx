import type { Metadata } from "next";

import { SignUpForm } from "@/components/auth/sign-up-form";
import { OrderForm } from "@/components/site/order-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { safeNextPath } from "@/lib/auth/redirect";
import { getActiveProducts, getProductBySlug } from "@/lib/products";

export const metadata: Metadata = { title: "Criar conta" };

/** Produto do cadastro: o do endereço de compra (`/comprar/<slug>`) ou, se só há um à venda, ele. */
async function productForSignUp(next: string) {
  const slug = /^\/comprar\/([a-z0-9-]+)/.exec(next)?.[1];
  if (slug) return getProductBySlug(slug);
  const active = await getActiveProducts();
  return active.length === 1 ? active[0] : null;
}

export default async function CadastroPage({
  searchParams,
}: PageProps<"/cadastro">) {
  const params = await searchParams;
  const next = safeNextPath(
    typeof params.next === "string" ? params.next : null,
  );
  const product = await productForSignUp(next);

  // Com um mapa à venda, o cadastro é o mesmo formulário da home: conta e dados
  // de nascimento de uma vez. Sem produto, só a conta.
  if (product) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Peça o seu mapa</CardTitle>
          <CardDescription>
            Crie a sua conta e informe os dados de nascimento de uma vez. Leva
            menos de um minuto; você confere tudo e paga na etapa seguinte.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OrderForm slug={product.slug} />
        </CardContent>
      </Card>
    );
  }

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
