import { ImageResponse } from "next/og";

import { SITE } from "@/lib/site-config";

export const alt = `${SITE.name} — seu mapa astral personalizado`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Estrelas fixas (posição em %), para a imagem sempre sair igual.
const STARS: [number, number, number][] = [
  [8, 14, 5],
  [18, 78, 4],
  [27, 30, 3],
  [38, 88, 5],
  [47, 10, 4],
  [58, 84, 3],
  [66, 22, 5],
  [76, 70, 4],
  [88, 12, 4],
  [92, 58, 5],
  [12, 50, 3],
  [83, 90, 3],
];

/**
 * Imagem que aparece quando o site é compartilhado (WhatsApp, redes, buscadores):
 * a marca sobre o céu da identidade visual. Gerada na hora do build.
 */
export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#151938",
        color: "#ece6d6",
        position: "relative",
      }}
    >
      {STARS.map(([x, y, r], i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: `${x}%`,
            top: `${y}%`,
            width: r * 2,
            height: r * 2,
            borderRadius: 999,
            background: "#d4b06a",
            opacity: 0.55,
          }}
        />
      ))}
      <div
        style={{
          display: "flex",
          width: 150,
          height: 150,
          borderRadius: 999,
          border: "4px solid #d4b06a",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 36,
        }}
      >
        <svg width="92" height="92" viewBox="0 0 64 64">
          <path
            d="M32 6 L36.4 27.6 L58 32 L36.4 36.4 L32 58 L27.6 36.4 L6 32 L27.6 27.6 Z"
            fill="#d4b06a"
          />
        </svg>
      </div>
      <div
        style={{
          fontSize: 108,
          fontWeight: 700,
          letterSpacing: 2,
          color: "#d4b06a",
        }}
      >
        {SITE.name}
      </div>
      <div style={{ fontSize: 40, marginTop: 14, color: "#ece6d6" }}>
        Seu mapa astral, escrito para você
      </div>
    </div>,
    size,
  );
}
