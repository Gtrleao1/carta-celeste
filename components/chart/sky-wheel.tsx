import { ChartWheel } from "@/components/chart/chart-wheel";
import { SkyMotion } from "@/components/chart/sky-motion";
import { computeSkyTimelapse } from "@/lib/astro";

const WHEEL_ID = "sky-wheel";

/**
 * Roda da home: o céu de hoje em câmera rápida. O servidor calcula tudo
 * (`computeSkyTimelapse`) e desenha o SVG como texto, como em qualquer roda do
 * site; o navegador só anima (`SkyMotion`) e, sem JavaScript ou com
 * "reduzir movimento", mostra a roda parada.
 */
export function SkyWheel() {
  const sky = computeSkyTimelapse();
  const asc = sky.chart.ascendant?.longitude ?? null;

  return (
    <figure className="grid gap-3">
      <div id={WHEEL_ID}>
        <ChartWheel
          chart={sky.chart}
          animated
          sky
          idPrefix="sky-wheel"
          title="O céu de hoje em câmera rápida"
        />
      </div>
      <SkyMotion
        targetId={WHEEL_ID}
        frames={sky.frames}
        highlights={sky.highlights}
        stepDays={sky.stepDays}
        ascendant={asc}
      />
      <figcaption className="text-muted-foreground text-center text-sm text-balance">
        O céu de hoje em câmera rápida: acendem o signo e a casa onde estão o
        Sol e a Lua. O seu mapa usa o céu do dia, da hora e do lugar em que você
        nasceu.
      </figcaption>
    </figure>
  );
}
