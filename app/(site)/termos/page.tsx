import type { Metadata } from "next";
import Link from "next/link";

import { LegalPage, orPending } from "@/components/site/legal-page";
import { DISCLAIMER, SITE } from "@/lib/site-config";

export const metadata: Metadata = { title: "Termos de Uso" };

// ATENÇÃO: texto-base. Revisar com assessoria jurídica e preencher os dados
// institucionais em lib/site-config.ts antes do lançamento.
export default function TermosPage() {
  return (
    <LegalPage title="Termos de Uso">
      <p>
        Estes Termos de Uso regulam o uso do site {SITE.name} e a compra dos
        relatórios astrológicos oferecidos nele. Ao criar uma conta ou fazer um
        pedido, você declara que leu e concorda com estes termos e com a{" "}
        <Link href="/privacidade">Política de Privacidade</Link>.
      </p>

      <h2>1. Quem somos</h2>
      <p>
        O {SITE.name} é operado por {orPending(SITE.legalName)}, inscrito no
        CNPJ {orPending(SITE.cnpj)}. Contato: {orPending(SITE.contactEmail)}.
      </p>

      <h2>2. O que oferecemos</h2>
      <p>
        Vendemos relatórios astrológicos personalizados. Cada relatório é gerado
        a partir dos dados de nascimento que você informa (data, hora e cidade):
        as posições dos astros são calculadas por um motor astronômico e o texto
        interpretativo é escrito com o auxílio de inteligência artificial. O
        relatório fica disponível na sua área do cliente.
      </p>

      <h2>3. Natureza do conteúdo</h2>
      <p>{DISCLAIMER}</p>
      <p>
        A astrologia não é ciência comprovada e o relatório não faz previsões
        garantidas. Não use o conteúdo como base para decisões médicas,
        psicológicas, financeiras ou jurídicas. Por ser escrito com apoio de
        inteligência artificial, o texto pode conter imprecisões de redação; as
        posições astronômicas, porém, vêm do cálculo, não da IA.
      </p>

      <h2>4. Cadastro e conta</h2>
      <ul>
        <li>
          Você deve informar dados verdadeiros e manter sua senha em sigilo.
        </li>
        <li>
          Você é responsável pelas atividades feitas com a sua conta. Avise-nos
          se suspeitar de uso indevido.
        </li>
        <li>
          Você pode excluir sua conta e seus dados a qualquer momento em “Minha
          conta”.
        </li>
      </ul>

      <h2>5. Dados de nascimento</h2>
      <p>
        O resultado depende da exatidão dos dados informados. Confira o resumo
        exibido antes do pagamento: erros de data, hora ou cidade geram um mapa
        diferente do esperado. Se você não informar a hora de nascimento, o
        Ascendente, o Meio do Céu e as casas não são calculados e o relatório é
        mais curto.
      </p>

      <h2>6. Preços, pagamento e entrega</h2>
      <ul>
        <li>
          Os preços aparecem em reais, no site, e podem mudar sem aviso prévio;
          vale o preço exibido no momento do pedido.
        </li>
        <li>
          O pagamento é processado pelo Mercado Pago (Pix, cartão de crédito em
          até 12 vezes ou boleto). Não temos acesso aos dados do seu cartão.
        </li>
        <li>
          O relatório é liberado depois da aprovação do pagamento, em geral em
          até 5 minutos. Boletos podem levar até alguns dias úteis para serem
          compensados.
        </li>
      </ul>

      <h2>7. Arrependimento e reembolso</h2>
      <p>
        Conforme o Código de Defesa do Consumidor, em compras feitas pela
        internet você pode desistir da compra em até 7 dias corridos, contados
        da data do pedido, pedindo o reembolso por{" "}
        {orPending(SITE.contactEmail)}. Se houver problema técnico que impeça a
        entrega do relatório, também faremos o reembolso.
      </p>

      <h2>8. Produtos para maiores de 18 anos</h2>
      <p>
        O produto “Mapa do Amor e Sexo” é destinado exclusivamente a maiores de
        18 anos, e pedimos uma declaração de maioridade antes do pagamento. Os
        demais produtos, quando comprados por menores de 18 anos, exigem
        autorização do responsável legal.
      </p>

      <h2>9. Propriedade intelectual</h2>
      <p>
        O site, a marca, o design, os textos e o software são do {SITE.name} ou
        licenciados para ele. O relatório que você compra é para o seu uso
        pessoal: você pode guardá-lo, imprimi-lo e compartilhá-lo com quem
        quiser, mas não pode revendê-lo nem republicá-lo como se fosse seu
        serviço.
      </p>

      <h2>10. Responsabilidade</h2>
      <p>
        Fazemos o possível para manter o site disponível e os relatórios
        corretos, mas não garantimos funcionamento ininterrupto. Na extensão
        permitida pela lei, não respondemos por decisões tomadas com base no
        conteúdo dos relatórios.
      </p>

      <h2>11. Alterações destes termos</h2>
      <p>
        Podemos atualizar estes termos. Quando a mudança for relevante, vamos
        avisar no site ou por e-mail. A data da última atualização está no topo
        desta página.
      </p>

      <h2>12. Lei aplicável e foro</h2>
      <p>
        Estes termos seguem as leis do Brasil. Para resolver conflitos, fica
        eleito o foro do domicílio do consumidor, conforme a lei.
      </p>
    </LegalPage>
  );
}
