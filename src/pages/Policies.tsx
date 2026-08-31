import { Container } from '../components/Container'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="glass rounded-3xl p-6 md:p-8">
      <h2 className="text-xl font-black text-slate-800">{title}</h2>
      <div className="mt-3 space-y-3 text-sm text-[rgb(var(--muted))]">{children}</div>
    </section>
  )
}

export function Policies() {
  return (
    <div className="py-10">
      <Container>
        <div>
          <div className="text-sm font-semibold text-pink-600">Políticas</div>
          <h1 className="mt-1 text-3xl font-black text-slate-800">Termos, entrega e reembolso</h1>
          <p className="mt-2 text-sm text-[rgb(var(--muted))]">
            Texto-base para transparência. Ajuste conforme sua forma real de trabalho.
          </p>
        </div>

        <div className="mt-8 grid gap-5">
          <Section title="Entrega (serviço digital)">
            <p>
              A entrega é digital e pode incluir: instruções, checklist, arquivos/configurações e/ou
              atendimento assistido. O prazo varia por pacote e fila e é confirmado no atendimento.
            </p>
            <p>
              O cliente se compromete a informar corretamente plataforma, dispositivo/modelo e
              detalhes solicitados para que a entrega seja precisa.
            </p>
          </Section>

          <Section title="Responsabilidade e expectativas">
            <p>
              Otimização e configurações dependem do dispositivo, versão do jogo e condições de uso.
              Não é possível garantir resultado idêntico para todos.
            </p>
            <p>
              Não oferecemos promessas irreais (ex.: "FPS infinito"). O objetivo é maximizar
              estabilidade e consistência dentro do que o hardware permite.
            </p>
          </Section>

          <Section title="Reembolso / cancelamento">
            <p>
              Por se tratar de serviço digital, após o início da execução/entrega (envio de arquivos,
              instruções ou atendimento assistido), o reembolso pode não ser aplicável.
            </p>
            <p>
              Se o pedido ainda não começou, o cancelamento pode ser solicitado no atendimento.
              Casos específicos podem ser avaliados conforme situação.
            </p>
          </Section>

          <Section title="Privacidade">
            <p>
              Os dados informados no checkout (nick, contato e dispositivo) são usados apenas para
              atendimento e entrega do serviço. Não vendemos informações.
            </p>
            <p>
              Pagamentos são processados pela <strong>Stripe</strong>; não armazenamos dados de
              cartão em nossos servidores.
            </p>
          </Section>
        </div>
      </Container>
    </div>
  )
}
