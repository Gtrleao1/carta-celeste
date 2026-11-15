import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Ícone para a tela inicial do iPhone e do iPad (a marca: anel e estrela de quatro pontas). */
export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#151938",
      }}
    >
      <svg width="132" height="132" viewBox="0 0 64 64">
        <circle
          cx="32"
          cy="32"
          r="26"
          fill="none"
          stroke="#d4b06a"
          strokeWidth="2.5"
        />
        <path
          d="M32 12 L35.6 28.4 L52 32 L35.6 35.6 L32 52 L28.4 35.6 L12 32 L28.4 28.4 Z"
          fill="#d4b06a"
        />
      </svg>
    </div>,
    size,
  );
}
