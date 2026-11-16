import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PostContent } from "@/components/blog/post-content";
import { buttonVariants } from "@/components/ui/button";
import { excerptFromDoc, readingMinutes } from "@/lib/blog/content";
import { getPublishedPostBySlug, getPublishedPosts } from "@/lib/blog/queries";
import { DISCLAIMER, SITE } from "@/lib/site-config";
import { SITE_URL } from "@/lib/site-origin";

// Estático, regenerado a cada 5 minutos. Posts novos abrem na primeira visita.
export const revalidate = 300;

export async function generateStaticParams() {
  const posts = await getPublishedPosts();
  return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/blog/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedPostBySlug(slug);
  if (!post) return { title: "Texto não encontrado" };
  const description = post.excerpt || excerptFromDoc(post.content);
  return {
    title: post.title,
    description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: "article",
      title: post.title,
      description,
      publishedTime: post.published_at,
      modifiedTime: post.updated_at,
      ...(post.cover_url && { images: [{ url: post.cover_url }] }),
    },
  };
}

const date = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "long",
  timeZone: "America/Sao_Paulo",
});

export default async function PostPage({ params }: PageProps<"/blog/[slug]">) {
  const { slug } = await params;
  const post = await getPublishedPostBySlug(slug);
  if (!post) notFound();

  const minutes = readingMinutes(post.content);
  const siteUrl = SITE_URL;

  // Dados estruturados para o Google (artigo).
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt || excerptFromDoc(post.content),
    datePublished: post.published_at,
    dateModified: post.updated_at,
    ...(post.cover_url && { image: post.cover_url }),
    author: { "@type": "Organization", name: SITE.name },
    publisher: { "@type": "Organization", name: SITE.name },
    mainEntityOfPage: `${siteUrl}/blog/${post.slug}`,
  };

  return (
    <article className="mx-auto grid w-full max-w-3xl gap-8 px-4 py-10 md:py-14">
      <script
        type="application/ld+json"
        // JSON gerado por nós a partir de campos já validados; `<` escapado.
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />

      <header className="grid gap-4">
        <Link
          href="/blog"
          className="text-muted-foreground hover:text-foreground w-fit text-sm underline underline-offset-4"
        >
          ← Blog
        </Link>
        <h1 className="text-4xl leading-tight font-semibold text-balance sm:text-5xl">
          {post.title}
        </h1>
        <p className="text-muted-foreground text-sm">
          <time dateTime={post.published_at}>
            {date.format(new Date(post.published_at))}
          </time>{" "}
          · {minutes} min de leitura
        </p>
      </header>

      {post.cover_url && (
        <div className="bg-muted relative aspect-[16/9] w-full overflow-hidden rounded-xl">
          <Image
            src={post.cover_url}
            alt={post.cover_alt}
            fill
            priority
            sizes="(min-width: 768px) 768px, 100vw"
            className="object-cover"
          />
        </div>
      )}

      <PostContent doc={post.content} />

      <aside
        aria-labelledby="chamada-mapa"
        className="bg-card border-border mt-4 grid gap-3 rounded-xl border p-6"
      >
        <h2 id="chamada-mapa" className="text-2xl font-semibold">
          Quer ler o seu próprio céu?
        </h2>
        <p className="text-muted-foreground">
          Sua Carta Celeste é calculada para o dia, a hora e a cidade em que
          você nasceu, e fica pronta em poucos minutos.
        </p>
        <Link
          href="/comprar"
          className={buttonVariants({ size: "lg" }) + " h-12 w-fit text-base"}
        >
          Receber minha carta
        </Link>
      </aside>

      <p className="text-muted-foreground text-xs">{DISCLAIMER}</p>
    </article>
  );
}
