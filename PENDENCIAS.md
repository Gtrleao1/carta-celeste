# Pendências para o lançamento (Etapa 8) e decisões em aberto

Lista viva do que ficou combinado ou descoberto nas etapas anteriores e **precisa
ser resolvido antes de vender de verdade**. Ao concluir um item, apague-o daqui.

## Pagamento (Mercado Pago)

- [ ] **Credenciais de produção** da aplicação que vai receber os pagamentos:
      `MERCADOPAGO_ACCESS_TOKEN` (produção) na Vercel, escopo Production.
- [ ] **Webhook de produção na MESMA aplicação do token.** O token (`APP_USR-<id da
    aplicação>-…`) e a assinatura secreta do webhook precisam ser da mesma
      aplicação. No ambiente de teste isso não fechou: as "Credenciais de teste"
      entregam o token de uma conta vendedora de teste com aplicação própria
      (`1946713615171447`), e os avisos reais são assinados por ela, não pela
      aplicação do painel (`3392623061404159`). Os avisos de teste chegam e são
      recusados com 401 (`assinatura recusada`), e a reconciliação confirma o
      pagamento. Em produção, configurar URL
      `https://<domínio>/api/webhooks/mercadopago`, evento **Pagamentos**, e
      copiar a assinatura secreta para `MERCADOPAGO_WEBHOOK_SECRET`.
- [ ] **Provar o webhook com uma compra real de valor baixo.** Critério: o pedido
      novo vira `paid` com `orders.paid_via = 'webhook'` (e não `reconciliacao`),
      sem o cliente abrir a página de retorno. Testar também o reembolso.
- [ ] **Pix ativo na conta vendedora real.** A conta de teste não oferece Pix
      (só cartão e boleto), e o PRD pede os três meios. Cadastrar a chave Pix da
      conta que recebe os pagamentos e conferir que "Pix" aparece no checkout.
- [ ] Remover do `MERCADOPAGO_WEBHOOK_SECRET` as chaves de teste que sobrarem
      (aceita várias separadas por vírgula).

## E-mail e contas

- [ ] **Resend como SMTP do Supabase** com domínio verificado. O envio padrão do
      Supabase só entrega para endereços da equipe do projeto e tem limite baixo
      por hora; clientes reais não receberiam o e-mail de confirmação.
- [ ] **Supabase → Authentication → URL Configuration:** Site URL e Redirect URLs
      do domínio final (hoje: `localhost:3000` e `carta-celeste.vercel.app`).
- [ ] Domínio próprio na Vercel e `NEXT_PUBLIC_SITE_URL` atualizado.

## Jurídico e conteúdo

- [ ] **Termos de Uso e Política de Privacidade** são texto-base: revisão
      jurídica e preencher `lib/site-config.ts` (razão social, CNPJ, e-mail).
- [ ] **Política de reembolso:** o texto atual cita o arrependimento de 7 dias
      do CDC. Confirmar que é a política desejada.
- [ ] **Depoimentos reais** no lugar dos cartões "espaço reservado" da home.
- [ ] Preços finais e eventual desconto de lançamento; domínio da marca (registro.br
      e INPI); CNPJ para a conta de vendedor e notas fiscais.
- [ ] Sistema de casas padrão: Placidus (atual) ou casas iguais.

## Segurança

- [ ] **`ai_instructions` e as instruções das seções ficam legíveis** por quem
      consultar a API pública com a chave anônima (a tabela `products` tem
      leitura pública, como o PRD manda). As páginas do site não as exibem, mas os
      prompts não são segredo. Resolver na Etapa 7 (painel admin), movendo esses
      campos para uma tabela só do servidor.
- [ ] Rever limites de requisições (checkout, busca de cidades, cadastro,
      recuperação de senha) com tráfego real.

## Qualidade

- [ ] Teste ponta a ponta com Playwright do fluxo de compra (Etapa 8).
- [ ] Lighthouse acima de 90 em desempenho e acessibilidade (home e páginas de
      produto) refeito no domínio final.
- [ ] Pedidos `pending` abandonados não expiram sozinhos; o painel admin
      (Etapa 7) deve filtrá-los, e pode haver um job de limpeza.
