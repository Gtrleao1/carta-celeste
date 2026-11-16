import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/site-origin";

export default function robots(): MetadataRoute.Robots {
  const url = SITE_URL;
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Áreas privadas e rotas de serviço não devem aparecer no Google.
      disallow: [
        "/admin",
        "/api/",
        "/conta",
        "/meus-mapas",
        "/pedido/",
        "/comprar",
        "/entrar",
        "/cadastro",
        "/auth/",
      ],
    },
    sitemap: `${url}/sitemap.xml`,
  };
}
