import type { NextConfig } from "next";

import { securityHeaders } from "./lib/security/headers";

// Imagens do blog ficam no Storage público do Supabase; o Next só otimiza
// imagens de hosts listados aqui.
const supabaseHost = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").hostname;
  } catch {
    return null;
  }
})();

const nextConfig: NextConfig = {
  // Não anuncia a tecnologia do servidor (cabeçalho X-Powered-By).
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders({
          supabaseHost,
          isDev: process.env.NODE_ENV === "development",
        }),
      },
    ];
  },
  images: {
    remotePatterns: supabaseHost
      ? [
          {
            protocol: "https",
            hostname: supabaseHost,
            pathname: "/storage/v1/object/public/blog/**",
          },
        ]
      : [],
  },
};

export default nextConfig;
