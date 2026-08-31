import { Container } from '../components/Container'

function QA({ q, a }: { q: string; a: string }) {
  return (
    <details className="glass rounded-2xl p-5">
      <summary className="cursor-pointer list-none text-sm font-black text-slate-800">
        {q}
        <span className="ml-2 text-[rgb(var(--muted))]">— toque para abrir</span>
      </summary>
      <p className="mt-3 text-sm text-[rgb(var(--muted))]">{a}</p>
    </details>
  )
}

export function FAQ() {
  return (
    <div className="py-10">
      <Container>
        <div>
          <div className="text-sm font-semibold text-pink-600">FAQ</div>
          <h1 className="mt-1 text-3xl font-black text-slate-800">Dúvidas frequentes</h1>
          <p className="mt-2 text-sm text-[rgb(var(--muted))]">
            Respostas rápidas sobre entrega, segurança e como funciona.
          </p>
        </div>

        <div className="mt-8 grid gap-4">
          <QA
            q="Como recebo a entrega?"
            a="A entrega é digital: pode ser checklist, instruções, arquivos/configs e/ou atendimento assistido (dependendo do pacote). O prazo é confirmado no atendimento."
          />
          <QA
            q="Isso é seguro?"
            a="Trabalhamos com ajustes guiados e reversíveis. Quando necessário (principalmente em PC), fazemos backup antes de qualquer alteração."
          />
          <QA
            q="Serve para qualquer dispositivo?"
            a="Cada pacote tem plataformas suportadas (Android, iOS e/ou PC). O resultado varia conforme o modelo, armazenamento, temperatura e configurações atuais."
          />
          <QA
            q="Quanto tempo leva?"
            a="Depende do pacote e da fila. Alguns são no mesmo dia; outros exigem agendamento. Tudo é combinado no WhatsApp."
          />
          <QA
            q="Quais formas de pagamento?"
            a="Cartão de crédito (parcelado em até 12x), cartão de débito, Pix (instantâneo) e Boleto bancário. Apple Pay e Google Pay também são aceitos. Tudo processado com segurança via Stripe direto no checkout."
          />
          <QA
            q="Como funciona o parcelamento no cartão?"
            a="No checkout, o próprio Stripe oferece as opções de parcelas (até 12x) com base no valor do pedido e no banco emissor do seu cartão. As parcelas são cobradas direto na sua fatura."
          />
          <QA
            q="E se eu pagar por boleto?"
            a="Você recebe o boleto na hora pra imprimir ou copiar o código de barras. O prazo de compensação é de 1 a 3 dias úteis. Quando o pagamento for confirmado pelo banco, liberamos o resgate automaticamente e te avisamos pelo Discord."
          />
          <QA
            q="Tem suporte depois?"
            a="Sim. Você pode tirar dúvidas após a compra. Pacotes avançados incluem suporte estendido."
          />
        </div>
      </Container>
    </div>
  )
}
