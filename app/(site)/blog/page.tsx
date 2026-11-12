import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { getPublishedPosts } from "@/lib/blog/queries";

// Página estática, regenerada a cada 5 minutos; posts novos entram sem deploy.
export const revalidate = 300;

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Textos sobre astrologia, mapa astral e autoconhecimento, escritos pela equipe da Carta Celeste.",
  alternates: { canonical: "/blog" },
};

const date = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "long",
  timeZone: "America/Sao_Paulo",
});

export default async function BlogPage() {
  const posts = await getPublishedPosts();

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 md:py-16">
      <header className="grid max-w-2xl gap-3">
        <p className="text-primary text-sm font-medium tracking-widest uppercase">
          Blog
        </p>
        <h1 className="text-5xl font-semibold text-balance">
          Astrologia para o dia a dia
        </h1>
        <p className="text-muted-foreground text-lg leading-relaxed">
          Textos sobre mapa astral, signos e autoconhecimento, em linguagem
          simples.
        </p>
      </header>

      {posts.length === 0 ? (
        <p className="text-muted-foreground mt-12 text-lg">
          Os primeiros textos chegam em breve.
        </p>
      ) : (
        <ul className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post, i) => (
            <li key={post.id}>
              <article className="bg-card border-border group grid h-full overflow-hidden rounded-xl border">
                <Link
                  href={`/blog/${post.slug}`}
                  className="grid content-start focus-visible:outline-2"
                >
                  <div className="bg-muted relative aspect-[16/9] w-full overflow-hidden">
                    {post.cover_url && (
                      <Image
                        src={post.cover_url}
                        alt={post.cover_alt}
                        fill
                        sizes="(min-width: 1024px) 384px, (min-width: 640px) 50vw, 100vw"
                        priority={i < 3}
                        className="object-cover transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none"
                      />
                    )}
                  </div>
                  <div className="grid gap-2 p-5">
                    <time
                      dateTime={post.published_at}
                      className="text-muted-foreground text-sm"
                    >
                      {date.format(new Date(post.published_at))}
                    </time>
                    <h2 className="text-2xl leading-snug font-semibold">
                      {post.title}
                    </h2>
                    {post.excerpt && (
                      <p className="text-muted-foreground leading-relaxed">
                        {post.excerpt}
                      </p>
                    )}
                    <span className="text-primary mt-1 text-sm font-medium">
                      Ler o texto →
                    </span>
                  </div>
                </Link>
              </article>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
