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
- Páginas públicas (`/`, `/mapa/[slug]`) são estáticas com `revalidate = 300` e leem produtos com o cliente anônimo (`lib/supabase/public.ts`); sem as chaves do Supabase (CI) elas saem vazias em vez de quebrar o build. Nunca selecione `ai_instructions` nem as instruções das seções em páginas públicas: desde a migração 8 o banco **recusa** a leitura dessas colunas (`ai_instructions`, `report_sections`) para o navegador, e `select *` em `products` também falha. A vitrine usa `section_titles` (chave e título, mantido por trigger). Coluna nova de `products` que a vitrine precisa ler exige `grant select (coluna)` em migração nova.
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
- Chave da IA recusada (`autenticacao`) ou **saldo da conta Anthropic esgotado** (`sem_credito`, HTTP 400 "credit balance is too low"): o passo **pausa** (`state: "paused"`) sem gastar tentativas, sem encadear novo job e sem falhar o pedido, que fica `generating`; corrigida a chave, a página de status retoma sozinha (uma chamada falha por vez enquanto não for corrigida). Variável nova na Vercel só vale após redeploy.
- **A IA não conta.** `chart-summary.ts` entrega as contagens prontas (CONCENTRAÇÕES por signo e casa, ELEMENTOS e MODALIDADES, cada uma com os nomes) só dos 10 planetas: o Nodo Norte é ponto, não planeta, e nunca entra em contagem. O prompt de sistema proíbe contar/agrupar por conta própria. Motivo: a IA já escreveu "quatro planetas em Capricórnio" citando três e misturando o Nodo Norte. Teste em `report-text.test.ts`.
- **Tensão sempre termina com direção:** o prompt exige que todo bloco sobre aspecto de atrito ou desafio feche com 2 a 4 habilidades/atitudes práticas para harmonizar as forças, em tom de convite, e uma frase que mostre a tensão como recurso.
- **Estrutura que o texto precisa ter (feedback do dono, mantida no prompt e nas instruções das seções):** sem orbes (o resumo traz só a exatidão em palavras); só aspectos do próprio planeta no bloco dele; todo bloco de tensão com lado positivo, lado difícil e 3-4 atitudes; trígono/sextil com influência positiva concreta; cada seção fecha com parágrafo de fechamento (insight, passo prático e curiosidade pela próxima seção); contagens com todos os nomes; frases concretas, nunca vagas. Seções do Mapa Completo: Sol, Lua, Ascendente e Trio são seções separadas (migração 16).
- **Prompt consolidado (`lib/reports/prompt.ts`) em 5 grupos:** dados e limites; estrutura dos blocos (um tema, títulos naturais, remissão entre seções, fechamento com título natural e curiosidade pela próxima, síntese com caminho concreto); aspectos (por inteiro, influência nos dois sentidos, só do próprio planeta, trígono com influência positiva, tensão com lados positivo/difícil/direção); posições e orientação (convivência de planetas na mesma casa/signo, cardinal = reinventar e recomeçar); estilo (sustentar/exigir, nunca cobrar; concreto). Instruções específicas ficam em `products.report_sections` (migrações 19 e 20).
- **Tamanho e repetição (decisão do dono):** alvo de 300-800 palavras por seção (Mapa Completo ≈ 10 mil palavras, meio-termo entre a 1ª versão, ≈ 6,5 mil, e a versão longa, ≈ 13,7 mil); 3 a 5 blocos por seção; fechamento curto, sem subtítulo, sem fórmulas ("fio condutor", "gesto simples", "esta semana") e com estilo que **alterna por seção** (`CLOSING_STYLES` em `prompt.ts`), porque a IA não vê as outras seções. Migração 21 tirou o "fio condutor" das sínteses.
- **Referência oficial do Mapa Astral Completo:** `docs/referencia/mapa-astral-completo-v3.md` (≈ 9,8 mil palavras, 13 seções) foi aprovado pelo dono como o padrão do produto: formato, tamanho, tom, fechamentos variados. Ao mexer no prompt ou nas instruções, compare a geração nova com ele (`npm run try:report`) e não mude o formato sem pedido do dono.
- **Mapa Profissional (migração 22, a partir do feedback do dono):** 8 seções — Sua vocação (inclui Meio do Céu e casa 10, regente e um bloco com profissões e áreas), Dinheiro e recursos (casa 2), Rotina e trabalho (casa 6), Talentos e estilo de ação (inclui Urano em Capricórnio e projetos que combinam), Desafios e amadurecimento (Saturno, curta), **Aspectos que devem ser melhor trabalhados** (tensões, limitações, riscos e pontos fracos), Oportunidades (Júpiter, o ponto de virada) e Síntese e próximos passos (consolida profissões, rotinas e talentos; o caminho em 3 passos é padrão). A seção separada Meio do Céu e casa 10 foi removida por repetir o assunto.
- **Leitura fácil, sempre (decisão do dono):** frases curtas (em geral até 25 palavras), palavras do dia a dia, nada de listas soltas de verbos nem metáforas empilhadas; perguntas ao leitor claras, concretas e uma por vez (até 15 palavras). Medida de referência no Mapa Profissional v5: frase média de ≈ 17 palavras e só 3% das frases com mais de 30. Ao mexer no prompt, confira isso numa geração de teste.
- **Dono de cada aspecto:** as seções são escritas em paralelo e não se enxergam, então cada aspecto é desenvolvido por inteiro em UMA seção (a do planeta dono) e nas outras só há remissão (migração 20). Ao criar produto novo, definir isso nas instruções das seções.
- **Custo de teste:** `npm run try:report` custa cerca de US$ 0,45-0,50 por geração do Mapa Completo (13 seções, ~13 mil palavras, ~2 min) e US$ 0,26-0,29 por Mapa Profissional ou do Amor (8 seções, ~1 min). Cuidado com o saldo.
- **Um tema por bloco:** o prompt de sistema manda cada subtítulo `###` abrir, desenvolver e concluir dentro de um único tema, usando só os dados dele (bloco de modalidades não cita Ascendente, outros signos nem casas). A Introdução do Mapa Astral Completo pede um bloco por traço (migração 11) e, para 3+ planetas no mesmo signo, um bloco do signo que mostra como ele colore a função de cada planeta (migração 12).
- Sem hora de nascimento: seções com `needs_houses` viram um texto explicativo, sem chamar a IA.
- Privacidade: `chart-summary.ts` só tem posições calculadas (sem nome, e-mail, data, hora, local ou coordenadas); há teste que garante isso.
- Modelo (`claude-sonnet-5-5`): sem `temperature`/`top_p`/prefill; `thinking: {type: "between_tools"}` (`disabled` dá 400); beta `server-side-fallback-2026-07-01` com `fallbacks: "default"`. Medido em 2026-10-08: relatório de 10 seções em ~60 s, ~6.400 palavras, ~US$ 0,20.
- `npm run try:report -- <orderId> [saida.md]` gera um relatório de verdade num pedido de teste (gasta créditos e **reinicia** o relatório do pedido; não envia e-mails).
- E-mail: `RESEND_FROM_EMAIL` (domínio verificado). Sem `RESEND_API_KEY` o envio é pulado com aviso, nunca derruba a geração.

## Copy da landing page

- **Vocabulário:** para o cliente (site, e-mails, termos, prompts da IA) o produto é sempre "mapa astral" ou "Carta Celeste", nunca "relatório". No código, tabelas e logs o termo interno continua `report`/relatório.

- **Por enquanto o site vende só o Mapa Astral Completo** (migração 24 desativou Mapa Profissional e Mapa do Amor e Sexo; nada foi apagado e eles voltam marcando "Ativo" em /admin/produtos). A home detecta isso: com **um** produto ativo mostra `FeaturedProduct` (nome, as 13 partes, preço e botão de compra, com o cartão de compra acima da lista no celular), passos sem "escolha o mapa" e uma pergunta extra na FAQ; com **dois ou mais**, volta à grade de cartões. Desempenho: a home com um mapa mede ≈ 87-89 no Lighthouse local (antes ≈ 90-93; a medição local varia ±8); as seções abaixo da dobra usam `content-visibility:auto` (`DEFER` em `page.tsx`) e a lista das partes é simples de propósito. Refazer a medição no domínio final (Vercel). Antes de reativar um produto, reformule o texto dele como foi feito com o Completo (`docs/referencia/`).
- Texto da home em `app/(site)/page.tsx` (copy v2: produto é "seu mapa astral" / "Carta Celeste"). O cartão de cada produto usa `products.tagline` (a pergunta, ex.: "Quem eu sou?"), a descrição curta e os pontos de foco, todos editáveis no admin; o botão é "Quero meu {nome do produto}". "A partir de R$ X" vem do menor preço ativo.
- **Depoimentos:** a seção só aparece se `TESTIMONIALS` em `lib/site-config.ts` tiver itens. Só depoimentos reais e autorizados (inventar é publicidade enganosa).
- A IA não é destaque nos títulos, mas a FAQ "Como o mapa é calculado?" diz que o texto é redigido com apoio de IA (coerente com Termos e Política de Privacidade). Não remover sem decisão jurídica.

## Área do cliente e admin (Etapa 7)

- **Meus mapas:** `/meus-mapas` lista os pedidos (RLS). `/meus-mapas/[id]` (o id é o do **pedido**, o mesmo do e-mail) mostra o relatório só se o pedido está `ready`; senão redireciona para `/pedido/[id]/retorno`, que acompanha o progresso e retoma geração parada. Pedido de outra pessoa dá 404 (RLS). O texto da IA passa por `lib/markdown.ts` (árvore de dados, nunca HTML cru).
- **Impressão:** classes `no-print`, `print-page-break` e `print-avoid-break` (`app/globals.css`); cabeçalho e rodapé do site são `no-print`.
- **Admin (`/admin`):** todo layout, página e Server Action chama `requireAdmin()` (`lib/admin/auth.ts`, usa `is_admin()` do banco); sem login vai para /entrar, logado sem papel recebe 404. **O layout não protege Server Actions**: toda ação nova do admin precisa chamar `requireAdmin()` sozinha. Escritas usam o cliente service role (`app/admin/actions.ts`).
- **Produtos como dados:** o formulário grava `report_sections` (chave, título, instruções, `needs_houses`); validação em `lib/admin/product-schema.ts` (Zod, preço em reais -> centavos no servidor). Salvar chama `revalidatePath` da home e de `/mapa/[slug]`. Produto novo nasce inativo; só dá para apagar produto sem pedidos (FK `restrict`), senão desativa.
- **Reprocessar:** `report_reprocess(order_id)` (SQL, service role): seções prontas ficam, as demais voltam a pendente com tentativas zeradas, pedido vai direto a `generating` (não repete o e-mail de pagamento) e o job é chamado de novo. Alertas do painel: pedidos `failed` e pagos há mais de 10 min sem ficar prontos (filtro `?status=stuck`).
- Admin não vê dados de nascimento do cliente (só e-mail do pedido, para suporte).

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
