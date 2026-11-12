import type { MetadataRoute } from "next";

import { getPublishedPosts } from "@/lib/blog/queries";
import { getActiveProducts } from "@/lib/products";

// Atualizado a cada hora (posts e produtos novos entram sem deploy).
export const revalidate = 3600;

const base = () =>
  (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(
    /\/$/,
    "",
  );

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, posts] = await Promise.all([
    getActiveProducts(),
    getPublishedPosts(),
  ]);
  const url = base();

  return [
    { url: `${url}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${url}/blog`, changeFrequency: "weekly", priority: 0.7 },
    ...posts.map((p) => ({
      url: `${url}/blog/${p.slug}`,
      lastModified: p.published_at,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    ...products.map((p) => ({
      url: `${url}/mapa/${p.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.9,
    })),
    { url: `${url}/termos`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${url}/privacidade`, changeFrequency: "yearly", priority: 0.2 },
  ];
}
