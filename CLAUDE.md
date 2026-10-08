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

- Next.js 16: `middleware` virou `proxy.ts`; `searchParams` e `cookies()` são assíncronos. Consulte `node_modules/next/dist/docs/` antes de escrever código de Next.
- Formulários usam Server Actions + Zod (`lib/auth/schemas.ts`) e devolvem `FormState`. Os campos são **controlados** (`Field` em `components/auth/form-parts.tsx`) porque o React 19 reseta o formulário após a ação e apagaria o que a pessoa digitou.
- Dois clientes Supabase: `lib/supabase/server.ts` (sessão do usuário, sujeito à RLS) e `lib/supabase/admin.ts` (service role, ignora a RLS; só depois de verificar quem pede).
- Excluir conta (LGPD): `auth.admin.deleteUser` apaga em cascata perfis, perfis de nascimento e relatórios; `orders.user_id` vira nulo (pedido anonimizado).

## Front-end e desempenho

- Identidade visual do PRD: tokens de cor em `app/globals.css` (tema escuro padrão, claro via classe `.dark` do `next-themes`); cores dos elementos viram `fill-fire`, `stroke-air` etc. Fontes: Cormorant Garamond (só peso 600; todo título usa `font-semibold`), Karla e símbolos astrológicos.
- A roda do mapa (`components/chart/chart-wheel.tsx`) injeta um SVG gerado como **texto** por `lib/chart-wheel/svg.ts`. Não reescreva como JSX: um SVG com centenas de elementos pesa na hidratação. O conteúdo só pode vir do cálculo e de constantes (nunca de entrada de usuário sem `esc`).
- Animação da roda: poucos grupos grandes e só fade. Cada elemento animado vira uma camada, e dezenas delas pesam na pintura (medido com Lighthouse). Evite `backdrop-blur` e animações infinitas.
- Fonte de símbolos: `app/fonts/noto-sans-symbols-astro.woff2` (6 KB, subconjunto do Noto Sans Symbols, SIL OFL). Se usar um glifo novo, regere com `scripts/build-symbols-font.ts`.
- Páginas públicas (`/`, `/mapa/[slug]`) são estáticas com `revalidate = 300` e leem produtos com o cliente anônimo (`lib/supabase/public.ts`); sem as chaves do Supabase (CI) elas saem vazias em vez de quebrar o build. Nunca selecione `ai_instructions` nem as instruções das seções em páginas públicas.
- Meta de desempenho (PRD): Lighthouse acima de 90 em desempenho e acessibilidade na home e nas páginas de produto. Medir sempre na versão de produção: `npm run build`, `npm run start` e `npx lighthouse http://localhost:3000/ --chrome-flags="--headless=new"`.
- Dados institucionais (razão social, CNPJ, e-mail) ficam em `lib/site-config.ts`; nulos, aparecem como "a definir" nas páginas legais, que são texto-base e precisam de revisão jurídica.

## Pagamento (Mercado Pago)

- Fluxo: `/comprar/[slug]` (3 telas) → `POST /api/checkout` (`lib/checkout/create-checkout.ts`) → Mercado Pago → `POST /api/webhooks/mercadopago` → `/pedido/[id]/retorno`.
- O preço **sempre** vem de `products.price_cents`; o corpo do checkout não tem campo de preço. Nova tentativa de pagamento usa só o `orderId` (pedido `pending` do próprio usuário).
- Webhook (`lib/payments/`): assinatura `x-signature` (HMAC-SHA256 do manifesto `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`) validada em `signature.ts`, falhando fechado sem segredo. O pagamento é **sempre** consultado na API (`getMpPayment`), o `external_reference` é o id do pedido e o valor pago precisa ser igual a `amount_cents`. Transições são condicionais (`where status = 'pending'`) para valer com avisos simultâneos. `rejected`/`cancelled` mantêm o pedido `pending` e gravam `mp_status` (é o que a página de retorno usa para mostrar "recusado").
- `MERCADOPAGO_WEBHOOK_SECRET` aceita **vários segredos separados por vírgula**: o Mercado Pago tem chave de modo teste e de produção, e contas de teste (`TESTUSER…`) operam com `live_mode: true`, então as notificações podem sair assinadas pela chave de produção. Avisos recusados registram só metadados no log (`assinatura recusada: data.id=… segredos_configurados=N`), nunca segredos.
- Reconciliação (`reconcile.ts`): se o pedido continua `pending` 10 s depois de criado, `GET /api/pedidos/[id]/status` busca os pagamentos pelo `external_reference` e aplica a mesma regra do webhook. É a rede de segurança contra webhook atrasado, perdido ou mal configurado; no máximo uma consulta a cada 10 s por pedido.
- A página de retorno **nunca trata "recusado" como final**: o banco guarda a recusa antiga enquanto uma nova tentativa pode ter sido aprovada (por "Tentar de novo" ou "Escolher outro meio" no Mercado Pago). Ela consulta já ao abrir e continua por até 2 min (`shouldKeepPolling` em `lib/orders/view.ts`). "Tentar de novo" zera `mp_status`, e antes de abrir outro pagamento confere no Mercado Pago se já há um aprovado (evita cobrança dupla).
- `orders.paid_via` (`webhook` ou `reconciliacao`) registra quem confirmou o pagamento. Pedido que só vira `paid` por reconciliação indica webhook que não chega: investigar o log da Vercel (`assinatura recusada…`).
- **Ambiente de teste do Mercado Pago:** o token das "Credenciais de teste" é de uma conta vendedora de teste com aplicação própria (id no 2º bloco do token, `APP_USR-<aplicação>-…-<usuário>`), e os avisos reais são assinados pela chave dela, não pela da aplicação do painel. Por isso os avisos de teste chegam e são recusados (401) e a reconciliação confirma os pagamentos; o simulador do painel passa (200). Em produção, token e assinatura secreta têm de ser da mesma aplicação. Pendências em `PENDENCIAS.md`.
- Regras de negócio do webhook ficam em `notification.ts` (puro, com dependências injetadas); não coloque lógica nova direto na rota.
- A `notification_url` da preferência termina em `?source_news=webhooks`: sem isso o Mercado Pago manda **IPN** (`?topic=payment&id=…`), que não tem assinatura verificável e o webhook recusa (401). Webhooks assinados chegam como `?type=payment&data.id=…`.
- Disparo do relatório: `triggerReportGeneration` (dentro de `after()`) faz `POST /api/jobs/generate-report` com `Authorization: Bearer $JOB_SECRET` e `{ orderId }`. A rota do job é `app/api/jobs/generate-report`. **O resumo do mapa enviado à IA não pode conter nome nem e-mail** (compromisso da Política de Privacidade).
- Limite de requisições: `withinRateLimit` (função `check_rate_limit` no Postgres; vale entre instâncias serverless). Checkout 10/min por usuário; busca de cidades 60/min por IP.
- Dev local não recebe webhooks (precisam de URL pública https): para testar o ciclo completo, use o site publicado na Vercel. Sem `https`, a preferência sai sem `notification_url` e `auto_return`.
- Nos testes, o pacote `server-only` aponta para `tests/stubs/server-only.ts` (ver `vitest.config.mts`).

## Geração do relatório (Etapa 6)

- Orquestração em `lib/reports/generate.ts` (`runGeneration`), **pura, com dependências injetadas** (store, writer, notifier, relógio): testada sem rede em `generate.test.ts`. Implementações reais: `store.ts` (Supabase, service role), `lib/ai/anthropic.ts` (escritor), `notify.ts` (e-mails). Não coloque lógica nova direto na rota.
- Fluxo: pedido `paid` → `generating` (só então sai o e-mail "pagamento confirmado") → mapa calculado **uma vez** e gravado em `reports.chart_data` → uma chamada à IA por seção (3 em paralelo) → `report_apply_section` (função SQL atômica: seções gravadas ao mesmo tempo não se perdem; soma tokens) → `ready` + e-mail "mapa pronto".
- **Retomável:** cada seção tem `status`/`attempts`; ao chamar de novo, só as pendentes são escritas. A rota tem `maxDuration = 60`: o job para de pegar seções novas aos 25 s (orçamento brando), encerra aos 55 s e, se sobrou trabalho, **chama a si mesmo** (`after(triggerReportGeneration)`). Trava por `reports.lock_until` (lease de 75 s) impede dois jobs no mesmo pedido.
- Retentativas: máx. 3 por seção (`MAX_ATTEMPTS`); esgotadas, o pedido vira `failed` e `reports.error` guarda só uma categoria (`secao_<chave>_falhou_<tipo>`). Nenhuma instrução nem erro bruto vai para `sections` (o cliente lê o próprio relatório pela RLS).
- Rede de segurança: `GET /api/pedidos/[id]/status` chama `needsResume` (`resume.ts`) e, se o pedido pago nunca começou ou parou há mais de 3 min, dispara o job de novo (no máximo 1 vez a cada 30 s por pedido).
- Sem hora de nascimento: seções com `needs_houses` viram um texto explicativo, sem chamar a IA.
- Privacidade: `chart-summary.ts` só tem posições calculadas (sem nome, e-mail, data, hora, local ou coordenadas); há teste que garante isso.
- Modelo (`claude-sonnet-5-5`): sem `temperature`/`top_p`/prefill; `thinking: {type: "between_tools"}` (`disabled` dá 400); beta `server-side-fallback-2026-07-01` com `fallbacks: "default"`. Medido em 2026-10-08: relatório de 10 seções em ~60 s, ~6.400 palavras, ~US$ 0,20.
- `npm run try:report -- <orderId> [saida.md]` gera um relatório de verdade num pedido de teste (gasta créditos e **reinicia** o relatório do pedido; não envia e-mails).
- E-mail: `RESEND_FROM_EMAIL` (domínio verificado). Sem `RESEND_API_KEY` o envio é pulado com aviso, nunca derruba a geração.

## Banco de dados (Supabase)

- Migrações em `supabase/migrations` (nome `AAAAMMDDHHMMSS_descricao.sql`). Nunca editar uma migração já aplicada: crie uma nova.
- Aplicar: `npx supabase@latest db push` (projeto já ligado com `supabase link`; no PowerShell do Windows use `npx.cmd` se `npx` for bloqueado).
- `npm run db:seed-cities` carrega as cidades (IBGE + GeoNames); `npm run db:seed-admin` dá o papel de admin ao `ADMIN_EMAIL` (a conta precisa existir).
- Os testes em `tests/integration` rodam contra o projeto Supabase de `.env.local` e são pulados sem as chaves (como no CI). Eles criam usuários descartáveis e limpam depois.

## Comandos

- `npm run dev` — servidor de desenvolvimento
- `npm run lint` — ESLint
- `npm run format` / `npm run format:check` — Prettier
- `npm test` — Vitest (unidade + integração, se houver `.env.local`)
- `npm run build` — build de produção

Antes de concluir uma etapa: `npm run lint`, `npm run format:check`, `npm test` e `npm run build` precisam passar.
