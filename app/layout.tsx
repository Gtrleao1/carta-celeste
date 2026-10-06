import type { Metadata } from "next";
import { Cormorant_Garamond, Karla } from "next/font/google";
import localFont from "next/font/local";

import { ThemeProvider } from "@/components/theme-provider";
import { SITE } from "@/lib/site-config";

import "./globals.css";

const karla = Karla({
  variable: "--font-karla",
  subsets: ["latin"],
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  // Só 600: todos os títulos usam font-semibold (menos peso de fonte para baixar).
  weight: ["600"],
  display: "swap",
});

// Símbolos astrológicos (☉ ☽ ♈ …) do Noto Sans Symbols (SIL OFL), reduzidos aos
// glifos usados (6 KB em vez de 148 KB). Para regerar: scripts/build-symbols-font.ts.
// Usados sempre com U+FE0E para não virarem emoji.
const symbols = localFont({
  src: "./fonts/noto-sans-symbols-astro.woff2",
  variable: "--font-symbols-face",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  ),
  title: {
    default: `${SITE.name} — relatórios astrológicos personalizados`,
    template: `%s — ${SITE.name}`,
  },
  description: SITE.description,
  openGraph: {
    title: SITE.name,
    description: SITE.description,
    locale: "pt_BR",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${karla.variable} ${cormorant.variable} ${symbols.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
