import type { Metadata } from "next";
import Link from "next/link";

import { LegalPage, orPending } from "@/components/site/legal-page";
import { SITE } from "@/lib/site-config";

export const metadata: Metadata = { title: "Política de Privacidade" };

// ATENÇÃO: texto-base. Revisar com assessoria jurídica e preencher os dados
// institucionais em lib/site-config.ts antes do lançamento.
export default function PrivacidadePage() {
  return (
    <LegalPage title="Política de Privacidade">
      <p>
        Esta política explica quais dados pessoais o {SITE.name} coleta, para
        que servem, com quem são compartilhados e quais são os seus direitos,
        conforme a Lei Geral de Proteção de Dados (LGPD, Lei 13.709/2018).
      </p>

      <h2>1. Quem é o responsável pelos dados</h2>
      <p>
        O controlador dos dados é {orPending(SITE.legalName)}, CNPJ{" "}
        {orPending(SITE.cnpj)}. Para qualquer assunto sobre privacidade, fale
        com o nosso canal de contato: {orPending(SITE.contactEmail)}.
      </p>

      <h2>2. Quais dados coletamos</h2>
      <ul>
        <li>
          <strong>Conta:</strong> nome completo, e-mail e senha (guardada de
          forma protegida, nunca em texto aberto) e, se você informar, a sua
          data de nascimento, usada para confirmar a maioridade nos produtos
          restritos.
        </li>
        <li>
          <strong>Dados de nascimento:</strong> nome, data, hora (se souber) e
          cidade de nascimento, com latitude, longitude e fuso horário. São
          necessários para calcular o mapa.
        </li>
        <li>
          <strong>Pedidos e pagamento:</strong> produto, valor, status e
          identificadores do pagamento. Os dados do cartão são tratados
          diretamente pelo Mercado Pago, e nós não os recebemos.
        </li>
        <li>
          <strong>Dados técnicos:</strong> informações básicas de acesso
          necessárias ao funcionamento e à segurança do site. Usamos apenas
          cookies essenciais (manter você logado e lembrar o tema claro ou
          escuro). Não usamos cookies de publicidade.
        </li>
      </ul>

      <h2>3. Para que usamos os dados</h2>
      <ul>
        <li>
          Criar e manter a sua conta e permitir o seu acesso (execução de
          contrato).
        </li>
        <li>
          Calcular o seu mapa, gerar o relatório e entregá-lo (execução de
          contrato).
        </li>
        <li>
          Processar o pagamento e emitir os registros fiscais (execução de
          contrato e obrigação legal).
        </li>
        <li>
          Enviar e-mails sobre o seu pedido, como a confirmação de pagamento e o
          aviso de que o mapa está pronto.
        </li>
        <li>Proteger o site contra fraudes e abusos (legítimo interesse).</li>
      </ul>

      <h2>4. Com quem compartilhamos</h2>
      <p>Compartilhamos dados apenas com prestadores necessários ao serviço:</p>
      <ul>
        <li>
          <strong>Supabase:</strong> banco de dados e autenticação, com
          armazenamento no Brasil (São Paulo).
        </li>
        <li>
          <strong>Vercel:</strong> hospedagem do site.
        </li>
        <li>
          <strong>Mercado Pago:</strong> processamento de pagamentos.
        </li>
        <li>
          <strong>Resend:</strong> envio de e-mails do seu pedido.
        </li>
        <li>
          <strong>Anthropic (API de inteligência artificial):</strong> para
          escrever o texto do relatório, enviamos o resumo do seu mapa, ou seja,
          as posições astrológicas já calculadas e as instruções do produto.
          Esse resumo não inclui o seu nome nem o seu e-mail.
        </li>
      </ul>
      <p>
        Alguns desses prestadores operam servidores fora do Brasil. Nesses
        casos, a transferência internacional é feita com as garantias previstas
        na LGPD. Não vendemos os seus dados e não os usamos para publicidade.
      </p>

      <h2>5. Por quanto tempo guardamos</h2>
      <p>
        Mantemos os dados da sua conta e dos seus mapas enquanto a conta
        existir. Quando você exclui a conta, apagamos o seu perfil, os perfis de
        nascimento e os relatórios. Os registros dos pedidos (valor, data e
        status) ficam guardados sem os seus dados pessoais, pelo prazo exigido
        pela legislação fiscal.
      </p>

      <h2>6. Seus direitos</h2>
      <p>Você pode, a qualquer momento:</p>
      <ul>
        <li>confirmar que tratamos seus dados e acessá-los;</li>
        <li>corrigir dados incompletos ou desatualizados;</li>
        <li>
          pedir anonimização, bloqueio ou eliminação de dados desnecessários;
        </li>
        <li>pedir a portabilidade dos seus dados;</li>
        <li>saber com quem compartilhamos os seus dados;</li>
        <li>
          revogar consentimentos e se opor a tratamentos, nos casos previstos em
          lei.
        </li>
      </ul>
      <p>
        Você pode apagar a sua conta e os seus dados sozinho, em{" "}
        <Link href="/conta">Minha conta</Link>, no botão “Excluir minha conta e
        meus dados”. Para os demais pedidos, escreva para{" "}
        {orPending(SITE.contactEmail)}. Se achar que seus dados foram tratados
        de forma incorreta, você também pode procurar a Autoridade Nacional de
        Proteção de Dados (ANPD).
      </p>

      <h2>7. Segurança</h2>
      <p>
        Usamos conexão criptografada, controle de acesso por usuário (cada
        pessoa só enxerga os próprios dados) e senhas protegidas. Nenhum sistema
        é totalmente imune a falhas, e se houver um incidente que possa causar
        risco relevante, avisaremos você e a ANPD, como manda a lei.
      </p>

      <h2>8. Crianças e adolescentes</h2>
      <p>
        O produto “Mapa do Amor e Sexo” é exclusivo para maiores de 18 anos. Os
        demais produtos, quando usados por menores de 18 anos, exigem
        autorização do responsável legal.
      </p>

      <h2>9. Mudanças nesta política</h2>
      <p>
        Podemos atualizar esta política. A data da última atualização está no
        topo da página e, em mudanças relevantes, avisaremos você.
      </p>
    </LegalPage>
  );
}
