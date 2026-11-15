"use client";

import { usePathname } from "next/navigation";

import { SkyArt } from "@/components/site/sky-art";
import { backdropFor } from "@/lib/constellations/pick";

/** Campo de estrelas fixo atrás da página (só a janela é pintada). */
export function SkyStars() {
  return <div aria-hidden="true" className="sky-stars" />;
}

/**
 * Três constelações de fundo, em alturas diferentes e nas laterais (o texto fica
 * no centro). Quais aparecem depende da página (`backdropFor`). Vai dentro de um
 * contêiner `relative isolate overflow-x-clip`.
 */
export function SkyBackdrop() {
  const [high, mid, low] = backdropFor(usePathname());
  return (
    <>
      <SkyArt
        {...high}
        className="absolute top-[14%] -right-[10%] size-[min(58vw,440px)]"
      />
      <SkyArt
        {...mid}
        className="absolute top-[48%] -left-[12%] size-[min(64vw,520px)]"
      />
      <SkyArt
        {...low}
        className="absolute top-[78%] -right-[8%] size-[min(54vw,420px)]"
      />
    </>
  );
}
