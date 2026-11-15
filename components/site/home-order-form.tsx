"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { useLoggedIn } from "@/components/site/use-logged-in";
import { buttonVariants } from "@/components/ui/button";
import { CTA_LABEL } from "@/lib/site-config";

type Props = { slug: string };

// O formulário é pesado (campos, busca de cidade) e fica abaixo da dobra: o
// código só é baixado e montado quando ele chega perto da tela (ou quando a
// pessoa vai a ele pelo botão "Quero minha Carta Celeste"), e não pesa na
// hidratação da home (medido com Lighthouse).
const OrderForm = dynamic(
  () => import("@/components/site/order-form").then((m) => m.OrderForm),
  { ssr: false },
);

/** Verdadeiro quando o elemento chega a ~800 px da tela (e continua assim). */
function useNearScreen<T extends Element>() {
  const ref = useRef<T>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || near) return;
    const io = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && setNear(true),
      { rootMargin: "800px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [near]);
  return [ref, near] as const;
}

/**
 * Formulário de compra da home, ao lado do preço: nome, nascimento, e-mail e
 * senha de uma vez. Cria a conta e guarda os dados de nascimento; o pagamento é
 * a etapa seguinte (`/comprar/<produto>?confirmar=1`). Quem já está logado vê só
 * o botão, que leva direto à compra com os perfis já salvos.
 */
export function HomeOrderForm({ slug }: Props) {
  const logged = useLoggedIn();
  const [ref, near] = useNearScreen<HTMLDivElement>();

  if (logged) {
    return (
      <Link
        href={`/comprar/${slug}`}
        className={buttonVariants({ size: "lg" }) + " h-12 text-base"}
      >
        {CTA_LABEL}
      </Link>
    );
  }

  return (
    // A altura reservada evita que o que vem depois "pule" quando o formulário aparece.
    <div ref={ref} className="min-h-[720px] sm:min-h-[760px]">
      {near ? (
        <OrderForm slug={slug} />
      ) : (
        <p role="status" className="text-muted-foreground text-sm">
          Carregando o formulário…
        </p>
      )}
    </div>
  );
}
