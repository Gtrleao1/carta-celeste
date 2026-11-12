import type { NextConfig } from "next";

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
