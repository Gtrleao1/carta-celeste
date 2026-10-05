@AGENTS.md

# Carta Celeste — regras permanentes

Loja online brasileira de relatórios astrológicos personalizados. A fonte de verdade do produto é o [PRD.md](PRD.md); em caso de conflito, o PRD vence. O projeto é executado por etapas (seção "Plano de execução" do PRD): faça só a etapa pedida e pare para revisão.

## Regras inegociáveis

- **A IA nunca calcula posições astrológicas.** Todo cálculo (planetas, ascendente, MC, casas, aspectos, regentes) vive em `lib/astro/` e roda só no servidor. A IA apenas recebe o `chart_data` pronto e escreve o texto.
- **Não reescrever o núcleo de cálculo** (seção "Motor de cálculo astrológico" do PRD) sem que os testes de referência continuem passando, com tolerância de ±1′ de arco.
- **Todo texto visível ao usuário em português do Brasil** (interface, e-mails, erros, metadados). Código, nomes de variáveis e commits podem ficar em inglês.
- **Segredos só em variáveis de ambiente.** Nunca no código nem no repositório; `.env.example` lista todas as variáveis, sem valores.
- **Em dúvida sobre regra de negócio, perguntar em vez de inventar.**

## Stack

Next.js (App Router) + TypeScript estrito, Tailwind CSS 4 + shadcn/ui, Supabase (Postgres, Auth, RLS), `astronomy-engine` e `tz-lookup` para cálculo, Mercado Pago Checkout Pro, API da Anthropic (modelo em `ANTHROPIC_MODEL`), Resend para e-mail, Vitest (unidade) e Playwright (fluxo de compra), deploy na Vercel.

## Convenções

- Preço sempre lido do banco, nunca definido pelo navegador.
- Service role key do Supabase só em rotas/ações de servidor. RLS ativo em todas as tabelas; migrações em `supabase/migrations`.
- Toda rota de API valida entradas com Zod.
- Rotas `/admin` verificam `user_roles` no servidor.
- Nenhum dado pessoal (nome, data de nascimento) em logs ou analytics.
- Celular primeiro; contraste AA, navegação por teclado, foco visível.
- Alias de import `@/*` aponta para a raiz do projeto (sem `src/`).

## Comandos

- `npm run dev` — servidor de desenvolvimento
- `npm run lint` — ESLint
- `npm run format` / `npm run format:check` — Prettier
- `npm test` — Vitest
- `npm run build` — build de produção

Antes de concluir uma etapa: `npm run lint`, `npm run format:check`, `npm test` e `npm run build` precisam passar.
