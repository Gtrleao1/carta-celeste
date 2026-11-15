import { artFile, type ArtVariant } from "@/lib/constellations/data";

/**
 * Ilustração de constelação como fundo decorativo (máscara CSS, ver `.sky-art`
 * em `globals.css`). `className` define posição e tamanho; o contêiner precisa
 * ser `relative isolate` para a arte ficar atrás do conteúdo.
 */
export function SkyArt({
  slug,
  variant = "linhas",
  className = "",
}: {
  slug: string;
  variant?: ArtVariant;
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={`sky-art -z-10 ${className}`}
      style={
        {
          "--art": `url(/constellations/${artFile(slug, variant)}.svg)`,
        } as React.CSSProperties
      }
    />
  );
}
