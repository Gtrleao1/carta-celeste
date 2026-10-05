# PRD — Carta Celeste

Oct 5, 2026 · @Guilherme

## Como usar este PRD no Claude Code

Exporte este documento como Markdown, salve como `PRD.md` na raiz do repositório e peça ao Claude Code para executá-lo uma etapa por vez.

1. Exporte este doc em Markdown e salve como `PRD.md` na raiz do repositório.
2. Abra o Claude Code na pasta do projeto.
3. Primeiro comando: "Leia o PRD.md. Crie um CLAUDE.md com as regras permanentes do projeto (stack, convenções, regra de que a IA nunca calcula posições). Depois execute apenas a Etapa 1 da seção 'Plano de execução' e pare para eu revisar."
4. A cada etapa concluída: rode os testes, confira os critérios de aceite, faça commit e só então peça a próxima etapa.

Regras para o agente durante todo o projeto:

- Todo texto visível ao usuário em português do Brasil.
- Nunca reescrever o núcleo de cálculo da seção 7 sem que o teste de referência continue passando.
- Segredos apenas em variáveis de ambiente; nunca no código ou no repositório.
- Em dúvida sobre regra de negócio, perguntar em vez de inventar.

## Visão geral, objetivos e público

Carta Celeste é uma loja online brasileira que vende relatórios astrológicos personalizados, calculados com precisão astronômica e interpretados por IA, entregues na área do cliente.

**Problema:** relatórios astrológicos online costumam ser genéricos ou caros e lentos quando feitos por astrólogos. O cliente quer algo personalizado, bonito e imediato.

**Objetivos do MVP:**

- Vender três produtos com pagamento via Pix, cartão parcelado e boleto.
- Entregar o relatório na área do cliente em até 5 minutos após a aprovação do pagamento.
- Cálculos que batam com referências do mercado (Personare, Astro.com) com diferença máxima de 1′ de arco.
- Permitir lançar novos produtos apenas cadastrando-os no painel admin, sem alterar código.

**Público:** brasileiros de 18 a 45 anos interessados em autoconhecimento, majoritariamente no celular, que já conhecem o próprio signo solar e querem ir além dele.

**Produtos iniciais** (preços provisórios, editáveis no admin):

| Produto | Preço | Foco da interpretação | Restrição |
| --- | --- | --- | --- |
| Mapa Astral Completo | R$ 49,00 | Leitura geral: Sol, Lua, Ascendente, todos os planetas, casas e aspectos principais | Nenhuma |
| Mapa Profissional | R$ 69,00 | Carreira, vocação e dinheiro: Meio do Céu, casas 2, 6 e 10, Sol, Saturno, Júpiter, Marte, regente da casa 10 | Nenhuma |
| Mapa do Amor e Sexo | R$ 69,00 | Afetividade, desejo e relacionamentos: Vênus, Marte, Lua, casas 5, 7 e 8, regente da casa 7 | Somente maiores de 18 anos |

## Escopo do MVP e fora de escopo

O MVP cobre o ciclo completo de uma venda: vitrine, cadastro, dados de nascimento, pagamento, cálculo, relatório e entrega na área do cliente.

**Dentro do escopo:**

- Home, página de cada produto e páginas legais.
- Cadastro e login por e-mail e senha, com recuperação de senha.
- Perfis de nascimento salvos e reutilizáveis em novas compras.
- Busca de cidade com autocompletar e fuso horário automático.
- Checkout Mercado Pago (Pix, cartão parcelado, boleto) e webhook de confirmação.
- Cálculo do mapa no servidor e geração do relatório por IA.
- Área do cliente "Meus mapas" com roda do mapa em SVG, tabelas e texto; impressão em PDF pelo navegador.
- Painel admin: produtos, pedidos, reprocessamento e configuração do sistema de casas.
- Confirmação de 18+ para produtos restritos.
- E-mails transacionais: confirmação de pagamento e "seu mapa está pronto".

**Fora do escopo (fases futuras):**

- Sinastria (dois perfis por pedido): o modelo de dados já prevê `required_people`, mas a interface fica para depois.
- Revolução solar, trânsitos e previsões.
- Cupons, afiliados e assinatura.
- Automações de marketing (n8n), carrinho abandonado, WhatsApp.
- Swiss Ephemeris, Quíron, Lilith e asteroides.
- App mobile nativo.

## Stack e arquitetura

Um único app Next.js na Vercel, com Supabase para banco, login e arquivos, tudo em planos gratuitos no início.

| Camada | Escolha | Motivo |
| --- | --- | --- |
| Front-end e back-end | Next.js (App Router) + TypeScript | Um só projeto; rotas de API servem o webhook e os jobs |
| Estilo | Tailwind CSS + shadcn/ui | Rápido de evoluir com o Claude Code |
| Hospedagem | Vercel, deploy automático a cada push no GitHub | Plano gratuito suficiente para o início |
| Banco e login | Supabase (Postgres, Auth, RLS) | Plano gratuito; RLS isola dados de cada cliente |
| Cálculo | `astronomy-engine` (npm, licença MIT) | Precisão validada; sem obrigação de abrir o código |
| Fuso a partir de coordenadas | `tz-lookup` (npm) | Funciona offline, sem API externa |
| Pagamento | Mercado Pago Checkout Pro | Pix, cartão parcelado e boleto desde o primeiro dia |
| IA | API da Anthropic (modelo Claude Sonnet mais recente, nome em `ANTHROPIC_MODEL`) | Texto longo de qualidade em português |
| E-mail | Resend | Plano gratuito, integração simples |
| Testes | Vitest (unidade) e Playwright (fluxo de compra) | Garante o cálculo e o checkout |

**Fluxo de uma compra:**

1. Cliente escolhe o produto e faz login.
2. Informa ou escolhe um perfil de nascimento.
3. O servidor cria o pedido (`pending`) e a preferência no Mercado Pago; o cliente é redirecionado para pagar.
4. O Mercado Pago chama `/api/webhooks/mercadopago`; o servidor consulta o pagamento na API, confirma e marca o pedido como `paid`.
5. O servidor dispara o job de geração (`/api/jobs/generate-report`) sem bloquear a resposta do webhook.
6. O job calcula o mapa, salva `chart_data`, gera o texto por seções com a IA e marca o pedido como `ready`.
7. O cliente recebe e-mail e vê o relatório em "Meus mapas".

**Robustez da geração:** o job gera o relatório seção por seção, salvando cada seção ao terminar, para caber no limite de tempo das funções da Vercel. Ele é idempotente e retomável: se a página "Meus mapas" encontrar um pedido em `generating` sem atualização há mais de 3 minutos, chama o job de novo, que continua da próxima seção pendente. O admin também pode reprocessar manualmente.

**Variáveis de ambiente:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_WEBHOOK_SECRET`, `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, `RESEND_API_KEY`, `JOB_SECRET` (protege a rota do job), `NEXT_PUBLIC_SITE_URL`. Criar um `.env.example` com todas, sem valores.

## Modelo de dados

Oito tabelas no Supabase, com migrações versionadas em `supabase/migrations` e RLS ativado em todas.

| Tabela | Campos principais | Acesso (RLS) |
| --- | --- | --- |
| `products` | id, slug (único), name, short\_description, long\_description, price\_cents, active, age\_restricted, required\_people (padrão 1), ai\_instructions, report\_sections (json), focus\_points (json), sort\_order, created\_at | Leitura pública dos ativos; escrita só admin |
| `profiles` | id (= auth.users.id), full\_name, birth\_date\_of\_buyer, accepted\_terms\_at, created\_at | Dono lê e edita o seu |
| `birth_profiles` | id, user\_id, name, birth\_date, birth\_time (nulo), time\_unknown, city\_name, latitude, longitude, timezone (IANA), created\_at | Dono lê, cria e apaga os seus |
| `orders` | id, user\_id, product\_id, birth\_profile\_id, status, amount\_cents, mp\_preference\_id, mp\_payment\_id, age\_confirmed\_at, created\_at, paid\_at, updated\_at | Dono lê os seus; escrita só servidor |
| `reports` | id, order\_id (único), user\_id, chart\_data (json), house\_system, sections (json: lista de {key, title, content, status}), error, created\_at, updated\_at | Dono lê os seus; escrita só servidor |
| `cities` | id, name, state\_or\_country, latitude, longitude, timezone, population | Leitura pública |
| `settings` | key, value (json) — inclui `default_house_system` (padrão `placidus`) | Leitura pública; escrita só admin |
| `user_roles` | user\_id, role (`admin`) | Só servidor |

**Status do pedido:** `pending` → `paid` → `generating` → `ready`; desvios: `failed` (com mensagem em `reports.error`), `refunded`, `cancelled`. Transições feitas só no servidor, com a service role key.

**Produtos como dados:** `report_sections` define as seções do relatório de cada produto (chave, título, instruções específicas). Lançar um produto novo = cadastrar uma linha com seções e instruções próprias.

**Cidades:** popular `cities` com todos os 5.570 municípios do IBGE (coordenadas da sede) e com as cidades do mundo acima de 15 mil habitantes do GeoNames (`cities15000`), com o fuso calculado por `tz-lookup`. Script de importação em `scripts/seed-cities.ts`.

**Seed:** os três produtos iniciais, a configuração padrão e um usuário admin definido por variável de ambiente `ADMIN_EMAIL`.

## Páginas e fluxos do usuário

Dez rotas públicas e de cliente, mais o painel admin, todas responsivas e pensadas primeiro para o celular.

| Rota | Conteúdo | Acesso |
| --- | --- | --- |
| `/` | Hero com a roda do mapa animada, vitrine dos produtos ativos, "como funciona" em 3 passos, depoimentos (placeholder), FAQ | Público |
| `/mapa/[slug]` | Descrição longa, o que o relatório inclui, exemplo de trecho, preço, botão "Quero meu mapa" | Público |
| `/entrar`, `/cadastro`, `/recuperar-senha` | Autenticação Supabase por e-mail e senha | Público |
| `/comprar/[slug]` | Etapas: escolher ou criar perfil de nascimento → confirmar dados → (18+ se restrito) → pagar | Logado |
| `/pedido/[id]/retorno` | Página de retorno do Mercado Pago: "pagamento em análise", "aprovado" ou "recusado", com status atualizado ao vivo | Logado (dono) |
| `/meus-mapas` | Lista de pedidos com status e data | Logado |
| `/meus-mapas/[id]` | Relatório completo: roda SVG, posições, casas, aspectos, texto por seções; botão "Imprimir / salvar PDF" | Logado (dono) |
| `/conta` | Dados pessoais, perfis de nascimento, excluir conta e dados (LGPD) | Logado |
| `/termos`, `/privacidade` | Termos de uso e política de privacidade | Público |
| `/admin` | Produtos (CRUD), pedidos (filtros por status, reprocessar), configurações | Admin |

**Formulário de nascimento:**

- Nome, data (seletor nativo), hora (seletor nativo) com a opção "Não sei a hora".
- Cidade: campo com autocompletar que busca na tabela `cities` a partir de 2 letras, sem acentos e sem diferenciar maiúsculas; mostra "Cidade, UF" ou "Cidade, País".
- Opção "Não encontrei minha cidade": latitude, longitude e fuso manuais.
- Ao confirmar, mostrar um resumo legível: "14 de julho de 1995, 15h30 (UTC−3), Campinas, SP", para o cliente conferir.
- Hora desconhecida: avisar antes do pagamento que ascendente e casas não serão calculados e que o relatório será mais curto.

**Confirmação 18+** (produtos com `age_restricted`): checkbox "Declaro ter 18 anos ou mais" e data de nascimento do comprador com idade calculada ≥ 18; gravar `age_confirmed_at` no pedido.

**Estados vazios e erros:** "Você ainda não tem mapas" com link para a vitrine; pagamento recusado com botão para tentar de novo; relatório com falha mostra "Estamos finalizando seu mapa" ao cliente e alerta no admin.

## Motor de cálculo astrológico

O cálculo roda só no servidor, em `lib/astro/`, com o código abaixo, já validado: bate com o Personare ao minuto de grau. A IA nunca calcula posições; ela só recebe o resultado pronto.

**Regras:**

- Zodíaco tropical; longitudes eclípticas geocêntricas verdadeiras da data (a função `Ecliptic` do astronomy-engine já devolve esse referencial).
- Corpos: Sol, Lua, Mercúrio, Vênus, Marte, Júpiter, Saturno, Urano, Netuno, Plutão e Nodo Norte médio.
- Retrogradação: longitude 12 h antes comparada com 12 h depois.
- Sistemas de casas: `placidus` (padrão, vindo de `settings`), `equal` e `whole`. Placidus em latitude ≥ 66° cai para `whole` e registra o motivo em `chart_data`.
- Hora desconhecida: calcular para 12:00 local, sem ascendente, MC nem casas; marcar `time_unknown: true`.
- Aspectos maiores entre os 10 planetas: conjunção 0° (orbe 8°), sextil 60° (5°), quadratura 90° (7°), trígono 120° (7°), oposição 180° (8°). Ordenar pelo orbe.
- Regentes modernos (para "regente da casa X"): Áries Marte, Touro Vênus, Gêmeos Mercúrio, Câncer Lua, Leão Sol, Virgem Mercúrio, Libra Vênus, Escorpião Plutão, Sagitário Júpiter, Capricórnio Saturno, Aquário Urano, Peixes Netuno. Guardar também o regente tradicional (Escorpião Marte, Aquário Saturno, Peixes Júpiter).
- Saída `chart_data`: entrada usada (data, hora, fuso, offset UTC, lat, lng, sistema), UTC calculado, ascendente, MC, cúspides, planetas (longitude, signo, grau, casa, retrógrado), aspectos, regentes de cada casa, contagem de elementos e modalidades.

**Núcleo validado** (portar para TypeScript mantendo a matemática idêntica):

```ts
import * as Astronomy from 'astronomy-engine';
const D2R = Math.PI / 180, R2D = 180 / Math.PI;
export const norm = (a: number) => ((a % 360) + 360) % 360;

// hora local + fuso IANA -> UTC (trata horário de verão histórico)
export function zonedToUtc(y: number, mo: number, d: number, h: number, mi: number, tz: string) {
  const fmt = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const offsetAt = (ms: number) => {
    const p: Record<string, string> = {};
    for (const x of fmt.formatToParts(new Date(ms))) p[x.type] = x.value;
    return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second) - ms;
  };
  const wall = Date.UTC(y, mo - 1, d, h, mi);
  let guess = wall - offsetAt(wall);
  guess = wall - offsetAt(guess);
  return { date: new Date(guess), offsetMin: Math.round(offsetAt(guess) / 60000) };
}

export function eclLon(body: keyof typeof Astronomy.Body, date: Date) {
  const t = Astronomy.MakeTime(date);
  return Astronomy.Ecliptic(Astronomy.GeoVector(Astronomy.Body[body], t, true)).elon;
}

export function meanNode(date: Date) {
  const T = Astronomy.MakeTime(date).tt / 36525;
  return norm(125.04452 - 1934.136261 * T + 0.0020708 * T * T + T * T * T / 450000);
}

function obliquity(date: Date) {
  const T = Astronomy.MakeTime(date).tt / 36525;
  return 23.439291 - 0.0130042 * T - 1.64e-7 * T * T + 5.04e-7 * T * T * T;
}

const raToLon = (ra: number, eps: number) =>
  norm(R2D * Math.atan2(Math.sin(ra * D2R), Math.cos(ra * D2R) * Math.cos(eps * D2R)));

export function angles(date: Date, lat: number, lng: number) {
  const eps = obliquity(date);
  const ramc = norm(Astronomy.SiderealTime(Astronomy.MakeTime(date)) * 15 + lng);
  const r = ramc * D2R, e = eps * D2R, f = lat * D2R;
  const mc = norm(R2D * Math.atan2(Math.sin(r), Math.cos(r) * Math.cos(e)));
  const asc = norm(R2D * Math.atan2(Math.cos(r), -(Math.sin(r) * Math.cos(e) + Math.tan(f) * Math.sin(e))));
  return { asc, mc, ramc, eps };
}

function placidus(ramc: number, eps: number, lat: number) {
  if (Math.abs(lat) >= 66) return null;
  const e = eps * D2R, f = lat * D2R;
  const cusp = (frac: number, below: boolean) => {
    let ra = ramc + (below ? 180 - 90 * frac : 90 * frac);
    for (let i = 0; i < 60; i++) {
      const dec = Math.atan(Math.tan(e) * Math.sin(ra * D2R));
      const dsa = R2D * Math.acos(Math.max(-1, Math.min(1, -Math.tan(f) * Math.tan(dec))));
      const next = below ? ramc + 180 - (180 - dsa) * frac : ramc + dsa * frac;
      if (Math.abs(next - ra) < 1e-7) { ra = next; break; }
      ra = next;
    }
    return raToLon(norm(ra), eps);
  };
  return [cusp(1 / 3, false), cusp(2 / 3, false), cusp(2 / 3, true), cusp(1 / 3, true)];
}

export function houseCusps(system: 'placidus' | 'equal' | 'whole', ang: ReturnType<typeof angles>, lat: number) {
  const { asc, mc, ramc, eps } = ang;
  if (system === 'whole') { const s = Math.floor(asc / 30) * 30; return Array.from({ length: 12 }, (_, i) => norm(s + 30 * i)); }
  if (system === 'equal') return Array.from({ length: 12 }, (_, i) => norm(asc + 30 * i));
  const p = placidus(ramc, eps, lat);
  if (!p) return null; // chamador cai para 'whole'
  const [c11, c12, c2, c3] = p;
  return [asc, c2, c3, norm(mc + 180), norm(c11 + 180), norm(c12 + 180),
          norm(asc + 180), norm(c2 + 180), norm(c3 + 180), mc, c11, c12];
}

export function houseOf(lon: number, cusps: number[]) {
  for (let i = 0; i < 12; i++) {
    const a = cusps[i], b = cusps[(i + 1) % 12];
    if (norm(lon - a) < norm(b - a)) return i + 1;
  }
  return 1;
}
```

**Testes obrigatórios** (Vitest, tolerância de ±1′ de arco; todos devem passar antes de qualquer outra etapa):

| Caso | Entrada | Resultado esperado |
| --- | --- | --- |
| Referência 1 | 14/07/1995 15:30, America/Sao\_Paulo, lat −22.91, lng −47.06, Placidus | ASC 23°38′ Sagitário; MC 11°08′ Virgem; Sol 21°51′ Câncer; Lua 23°59′ Aquário; casa 2 em 17°45′ Capricórnio; Sol na casa 8 |
| Referência Personare | 13/07/1990 17:35 UTC, lat −23.30, lng −46.60, Placidus | ASC 10°07′ Sagitário; MC 26°15′ Leão; casas 2 5°10′ Cap, 3 29°23′ Cap, 5 28°15′ Pei, 6 4°35′ Tou; Urano 7°02′ Cap na casa 2; Marte 0°45′ Tou na casa 5 |
| Casas iguais | mesmo caso Personare, `equal` | casa 2 em 10°07′ Capricórnio; Urano na casa 1 |
| Horário de verão | 15/01/1995 12:00 e 14/07/1995 12:00, America/Sao\_Paulo | offsets −120 min e −180 min |
| Polo | qualquer data, lat 70, Placidus | cai para `whole` com motivo registrado |
| Validação geométrica | 16 combinações de 4 cidades × 4 horários | altitude do ASC = 0° ± 0,05° e azimute a leste (entre 0° e 180°), usando `Astronomy.Horizon` |

## Pagamento Mercado Pago

Checkout Pro do Mercado Pago, com o pedido confirmado só depois que o servidor consulta o pagamento na API, nunca apenas pelo aviso recebido.

**Criar o checkout** (`POST /api/checkout`, servidor, SDK oficial `mercadopago`):

- Validar sessão, produto ativo, perfil de nascimento do usuário e, se restrito, a confirmação 18+.
- Criar o pedido `pending` com o preço lido do banco (nunca do navegador).
- Criar a preferência com: item (nome e preço do produto), `external_reference` = id do pedido, `payer.email`, `notification_url` = `{SITE_URL}/api/webhooks/mercadopago`, `back_urls` (success, pending, failure) apontando para `/pedido/[id]/retorno`, `auto_return: approved`, parcelamento até 12x.
- Salvar `mp_preference_id` e redirecionar para o `init_point`.

**Webhook** (`POST /api/webhooks/mercadopago`):

1. Validar a assinatura do cabeçalho `x-signature` com HMAC SHA-256 e `MERCADOPAGO_WEBHOOK_SECRET`, conforme a documentação atual do Mercado Pago; assinatura inválida → 401.
2. Para eventos de pagamento, consultar `GET /v1/payments/{id}` com o access token.
3. Conferir que `external_reference` existe e que o valor pago é igual ao `amount_cents` do pedido.
4. `approved` → marcar `paid`, gravar `mp_payment_id` e `paid_at`, disparar o job de geração. `refunded` ou `charged_back` → `refunded`. `rejected` ou `cancelled` → manter `pending` para nova tentativa.
5. Idempotência: se o pedido já passou de `pending`, responder 200 sem refazer nada.
6. Responder 200 rapidamente; todo trabalho pesado vai para o job.

**Página de retorno:** não confia nos parâmetros da URL; consulta o status do pedido no banco a cada 3 s por até 2 min.

**Testes:** usar credenciais de teste e usuários de teste do Mercado Pago; teste automatizado do webhook com assinatura válida, inválida, evento repetido e valor divergente.

## Geração do relatório por IA

O relatório é escrito pela API da Anthropic, uma chamada por seção, a partir do `chart_data` calculado e das instruções do produto.

**Job** (`POST /api/jobs/generate-report`, protegido por `JOB_SECRET`):

1. Se o pedido estiver `paid`, mudar para `generating`; se já estiver `ready`, encerrar.
2. Se não houver `chart_data`, calcular e salvar.
3. Para cada seção de `products.report_sections` ainda sem conteúdo: gerar, salvar em `reports.sections` e atualizar `updated_at`.
4. Parar antes de 50 s de execução e chamar a si mesmo para continuar, se faltar seção.
5. Com todas as seções prontas: `ready`, e-mail "Seu mapa está pronto".
6. Erro: até 3 tentativas por seção; depois `failed`, erro salvo e alerta no admin.

**Prompt de cada seção:**

- Sistema: papel de astrólogo experiente que escreve em português do Brasil, em segunda pessoa, tom acolhedor e preciso. Nunca inventar posições: usar somente os dados fornecidos. Sem previsões deterministas, diagnósticos de saúde, conselhos financeiros ou jurídicos. Linguagem adulta e respeitosa no produto de amor e sexo, sem conteúdo explícito.
- Usuário: `ai_instructions` do produto + instruções da seção + resumo legível do mapa (planeta, signo, grau, casa, retrógrado; ângulos; regentes; aspectos com orbes) + as seções já escritas, só pelos títulos, para evitar repetição.
- Saída em Markdown, com subtítulos `###`, de 350 a 700 palavras por seção.

**Seções sugeridas por produto** (cadastradas em `report_sections`, editáveis no admin):

| Produto | Seções |
| --- | --- |
| Mapa Astral Completo | Introdução ao seu mapa · Sol, Lua e Ascendente · Mente e comunicação · Amor e valores · Ação e desejo · Crescimento e desafios · Gerações · As 12 casas · Aspectos marcantes · Síntese |
| Mapa Profissional | Sua vocação · Meio do Céu e casa 10 · Dinheiro e recursos (casa 2) · Rotina e trabalho (casa 6) · Talentos e estilo de ação · Desafios e amadurecimento (Saturno) · Oportunidades (Júpiter) · Síntese e próximos passos |
| Mapa do Amor e Sexo | Como você ama (Vênus) · Desejo e conquista (Marte) · Necessidades emocionais (Lua) · Romance e prazer (casa 5) · Parcerias (casa 7 e seu regente) · Intimidade e entrega (casa 8) · Padrões e aspectos · Síntese |

Hora desconhecida: as seções que dependem de casas ou ângulos são substituídas por uma explicação curta de por que não foram calculadas.

**Custo:** registrar tokens de entrada e saída por pedido em `reports` para acompanhar o custo médio por relatório.

## Identidade visual e UX

A marca se inspira num astrolábio de latão sob o céu noturno, e a roda do mapa em SVG é o elemento memorável: aparece na home, nas páginas de produto e no relatório.

| Token | Escuro (padrão) | Claro |
| --- | --- | --- |
| Fundo | #151938 | #EDEFF6 |
| Superfície | #1D2249 | #FFFFFF |
| Texto | #ECE6D6 | #1B1F45 |
| Texto secundário | #A8A7C6 | #585C7E |
| Destaque (latão) | #D4B06A | #8C6820 |
| Fogo | #EE8574 | #C4473A |
| Terra | #A7C47C | #4F7A2D |
| Ar | #8DB6EE | #2F6DB5 |
| Água | #6CCBC6 | #1E8584 |

**Tipografia:** Cormorant Garamond para títulos, Karla para textos e interface; símbolos astrológicos com Noto Sans Symbols e o seletor de variação de texto (U+FE0E) para não virarem emoji.

**Roda do mapa:** componente React `ChartWheel` que recebe `chart_data` e desenha em SVG: anel do zodíaco com setores na cor do elemento, marcas de grau, cúspides, eixos AC/MC/DC/FC em latão, planetas com afastamento automático quando ficam próximos (mínimo de 9°), grau ao lado de cada planeta, ℞ para retrógrados e linhas de aspectos (azul para harmônicos, vermelho para tensos). Ascendente sempre à esquerda; sem hora, Áries à esquerda e sem casas.

**UX:**

- Celular primeiro: formulário em uma coluna, botões grandes, checkout em no máximo 3 telas.
- Tom de voz acolhedor, sem jargão sem explicação; termos técnicos com uma frase de contexto.
- Acessibilidade: contraste AA, navegação por teclado, `aria-label` na roda, foco visível.
- Impressão: CSS de impressão com fundo claro, roda em página própria e quebras entre seções.
- Desempenho: Lighthouse acima de 90 em desempenho e acessibilidade na home e nas páginas de produto.

## Requisitos não funcionais, LGPD e segurança

Dados de nascimento são dados pessoais: o site coleta só o necessário, explica o uso e permite exclusão a qualquer momento.

**LGPD:**

- Aceite de termos e política de privacidade no cadastro, com data gravada em `profiles.accepted_terms_at`.
- Política de privacidade explicando: dados coletados, finalidade (gerar o relatório), envio dos dados do mapa à API de IA para escrever o texto, retenção e direitos do titular.
- Em `/conta`, botão "Excluir minha conta e meus dados" que apaga perfis, relatórios e a conta; pedidos ficam anonimizados para fins fiscais.
- Nenhum dado pessoal em logs; nada de nome ou data de nascimento enviados a ferramentas de analytics.
- Aviso visível nos produtos e no relatório: conteúdo para autoconhecimento e entretenimento.

**Segurança:**

- RLS em todas as tabelas; service role key usada só em rotas do servidor.
- Preço sempre lido do banco; o navegador nunca define valores.
- Webhook com assinatura validada e confirmação pela API; rota do job protegida por `JOB_SECRET`.
- Rotas `/admin` verificadas no servidor por `user_roles`, não só escondidas na interface.
- Limite de requisições no checkout e na busca de cidades.
- Validação de entradas com Zod em todas as rotas de API.

**Qualidade e operação:**

- TypeScript estrito, ESLint e Prettier; CI no GitHub Actions rodando lint, testes do motor de cálculo e build a cada push.
- Relatório pronto em até 5 minutos após o pagamento em 95% dos pedidos.
- Painel admin mostrando pedidos `failed` ou parados em `generating` há mais de 10 minutos.

## Plano de execução e critérios de aceite

Oito etapas em sequência; cada uma termina com testes passando, commit e revisão sua antes da próxima.

1. **Base do projeto.** Next.js + TypeScript + Tailwind + shadcn/ui, ESLint, Prettier, Vitest, `.env.example`, `CLAUDE.md`, CI no GitHub Actions.
   - Aceite: `npm run build` e `npm test` passam; deploy na Vercel mostrando uma página inicial.
2. **Motor de cálculo.** `lib/astro/` com o núcleo da seção 7, `computeChart`, regentes, aspectos e todos os testes da tabela de referência.
   - Aceite: todos os casos de teste passam com tolerância de ±1′.
3. **Banco e autenticação.** Migrações, RLS, seed de produtos e configurações, importação de cidades, cadastro, login, recuperação de senha e `/conta`.
   - Aceite: um usuário não consegue ler dados de outro (teste de RLS); busca "campinas" retorna "Campinas, SP" com fuso America/Sao\_Paulo.
4. **Vitrine e roda do mapa.** Home, `/mapa/[slug]`, componente `ChartWheel`, tema claro e escuro, páginas legais.
   - Aceite: roda do caso Referência 1 com ascendente à esquerda e planetas sem sobreposição; Lighthouse acima de 90.
5. **Compra e pagamento.** `/comprar/[slug]`, perfis de nascimento, 18+, `/api/checkout`, webhook e página de retorno.
   - Aceite: compra de teste com Pix e cartão aprovada no ambiente de teste muda o pedido para `paid`; webhook repetido não duplica nada; assinatura inválida é recusada.
6. **Geração do relatório.** Job por seções, retomada automática, e-mails transacionais.
   - Aceite: relatório completo pronto em menos de 5 minutos; derrubar o job no meio e chamar de novo continua de onde parou.
7. **Área do cliente e admin.** `/meus-mapas`, relatório com impressão, painel admin com produtos, pedidos, reprocessar e sistema de casas.
   - Aceite: cadastrar um quarto produto no admin o faz aparecer na vitrine e gerar relatório com as seções dele, sem mudar código.
8. **Lançamento.** Teste ponta a ponta com Playwright, revisão de textos legais, credenciais de produção do Mercado Pago, domínio próprio e e-mail com domínio verificado.
   - Aceite: uma compra real de valor baixo, feita por você, chega ao relatório pronto e o reembolso funciona.

**Perguntas em aberto para decidir antes da Etapa 8:**

- Preços finais e se haverá desconto de lançamento.
- Domínio da marca (verificar cartaceleste.com.br no registro.br e a marca no INPI).
- CNPJ (MEI ou outro) para a conta de vendedor do Mercado Pago e emissão de nota fiscal.
- Sistema de casas padrão: Placidus (mais comum no mercado) ou casas iguais.
