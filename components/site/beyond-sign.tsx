import Link from "next/link";
import type { ReactNode } from "react";

import { buttonVariants } from "@/components/ui/button";
import { CTA_LABEL } from "@/lib/site-config";

const ICON = {
  className: "size-7",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

type Topic = { title: string; question: string; text: string; icon: ReactNode };

/** Temas da leitura, na linguagem de quem pergunta. Ícones desenhados no código. */
const TOPICS: Topic[] = [
  {
    title: "Sua identidade",
    question: "Por que os outros te veem de um jeito e você se sente de outro?",
    text: "Sol, Lua e Ascendente, e como os três conversam dentro de você.",
    icon: (
      <svg {...ICON}>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1" />
      </svg>
    ),
  },
  {
    title: "Suas emoções",
    question: "O que você precisa para se sentir em paz?",
    text: "Como você sente, o que te acolhe e o que te desestabiliza.",
    icon: (
      <svg {...ICON}>
        <path d="M12 3C9 7.5 5 11 5 15a7 7 0 0 0 14 0c0-4-4-7.5-7-12Z" />
      </svg>
    ),
  },
  {
    title: "Sua dinâmica relacional",
    question: "O que você procura no amor e onde costuma tropeçar?",
    text: "Seu jeito de se aproximar, de conquistar e de se proteger.",
    icon: (
      <svg {...ICON}>
        <circle cx="9" cy="12" r="5.5" />
        <circle cx="15" cy="12" r="5.5" />
      </svg>
    ),
  },
  {
    title: "Seu comportamento",
    question: "Como você reage, decide e recomeça?",
    text: "Seus impulsos, seu ritmo e a energia que te move.",
    icon: (
      <svg {...ICON}>
        <path d="M12 3c.8 4 5 6 5 11a5 5 0 0 1-10 0c0-2 .9-3.2 2-4 0 2 .8 3 2 3-.5-3 .2-6 1-10Z" />
      </svg>
    ),
  },
  {
    title: "Seu trabalho e seus talentos",
    question: "Onde o seu jeito rende mais?",
    text: "O que te motiva e que talentos aparecem na forma como você trabalha.",
    icon: (
      <svg {...ICON}>
        <path d="M3 19 9.5 8l4 7 2.5-4 5 8Z" />
      </svg>
    ),
  },
  {
    title: "Suas tensões internas",
    question: "Por que parte de você puxa para um lado e parte para o outro?",
    text: "Os conflitos do seu mapa, com o lado difícil e o lado que vira força.",
    icon: (
      <svg {...ICON}>
        <path d="M4 8h15m-4-4 4 4-4 4M20 16H5m4-4-4 4 4 4" />
      </svg>
    ),
  },
];

/**
 * "Muito além do seu signo solar": o que a pessoa vai descobrir sobre si,
 * ligado às partes da leitura. Texto e ícones estáticos (sem cliente).
 */
export function BeyondSign({ buyHref }: { buyHref: string }) {
  return (
    <section
      id="descobrir"
      aria-labelledby="titulo-descobrir"
      className="mx-auto w-full max-w-6xl scroll-mt-20 px-4 py-14"
    >
      <p className="text-primary text-sm font-medium tracking-widest uppercase">
        Muito além do seu signo solar
      </p>
      <h2 id="titulo-descobrir" className="mt-2 text-4xl font-semibold">
        Você é mais do que o seu signo.
      </h2>
      <p className="text-muted-foreground mt-2 max-w-prose text-lg">
        O signo do Sol é uma só peça. Seu mapa astral junta dez planetas, doze
        casas e os ângulos entre eles. Em vez de uma frase genérica, você recebe
        uma leitura completa integrando personalidade e comportamento.
      </p>

      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TOPICS.map((t) => (
          <li
            key={t.title}
            className="bg-card border-border grid content-start gap-3 rounded-xl border p-6"
          >
            <span className="text-primary">{t.icon}</span>
            <p className="text-muted-foreground text-sm font-medium tracking-wide uppercase">
              {t.title}
            </p>
            <h3 className="font-heading text-2xl leading-snug font-semibold">
              {t.question}
            </h3>
            <p className="text-muted-foreground leading-relaxed">{t.text}</p>
          </li>
        ))}
      </ul>

      <p className="text-muted-foreground mt-6 max-w-prose">
        Tudo em linguagem simples, com exemplos do dia a dia. Sem precisar
        entender de astrologia.
      </p>
      <div className="mt-6">
        <Link
          href={buyHref}
          className={buttonVariants({ size: "lg" }) + " h-12 px-6 text-base"}
        >
          {CTA_LABEL}
        </Link>
      </div>
    </section>
  );
}
