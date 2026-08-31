import type { Product } from '../types'

export const products: Product[] = [
  {
    id: 'otm-basic',
    slug: 'otimizacao-simples',
    name: 'Otimização Simples',
    subtitle: 'Ajustes rápidos pra estabilidade e fluidez',
    priceBRL: 20,
    category: 'Otimização FPS',
    platforms: ['Android', 'iOS'],
    delivery: 'Entrega rápida (mesmo dia, em horário comercial)',
    highlights: ['FPS mais estável', 'Menos travadas', 'Configuração leve'],
    includes: [
      'Ajustes de desempenho (seguro e reversível)',
      'Configuração de sensibilidade base (se quiser)',
      'Checklist de configurações no jogo',
      'Suporte pós-compra (dúvidas)',
    ],
    description:
      'Ideal pra quem quer melhorar a fluidez sem mexer pesado no aparelho. Foco em estabilidade, responsividade e ajustes essenciais.',
  },
  {
    id: 'otm-advanced',
    slug: 'otimizacao-avancada',
    name: 'Otimização Avançada',
    subtitle: 'Pacote completo: ajustes + refinamento por modelo',
    priceBRL: 50,
    category: 'Otimização FPS',
    platforms: ['Android', 'iOS', 'PC'],
    delivery: 'Agendamento + entrega prioritária',
    highlights: ['Mais consistência no “peak”', 'Ajuste por dispositivo', 'Guia de manutenção'],
    includes: [
      'Análise do dispositivo (modelo / specs / armazenamento)',
      'Otimização detalhada (segura e reversível)',
      'Ajustes finos de sensibilidade (se solicitado)',
      'Configuração de HUD/controles (opcional)',
      'Recomendações de “setup” e rotina de limpeza',
      'Suporte estendido pós-compra',
    ],
    description:
      'Pra quem quer o máximo de estabilidade possível com ajustes direcionados ao seu aparelho/PC. Inclui refinamento e suporte mais completo.',
    popular: true,
  },
  {
    id: 'pack-sensi-pro',
    slug: 'pack-otm-sensibilidade-pro',
    name: 'Pack OTM + Sensibilidade Pro',
    subtitle: 'Sensibilidade + configs prontas (ajuste fino incluído)',
    priceBRL: 35,
    category: 'Packs OTM',
    platforms: ['Android', 'iOS'],
    delivery: 'Entrega em até 24h',
    highlights: ['Sensibilidade “no ponto”', 'Config de mira', 'Treino sugerido'],
    includes: [
      'Pack de sensibilidade por estilo (2–3 variações)',
      'Configurações de mira e DPI (se aplicável)',
      'Config do jogo (gráficos/controle)',
      'Mini plano de adaptação (3 dias)',
    ],
    description:
      'Pack pra quem quer “copiar e ajustar” com segurança. Você recebe variações e um ajuste fino pra encaixar no seu jeito de jogar.',
  },
  {
    id: 'config-phone',
    slug: 'configs-de-celular',
    name: 'Configs de Celular (Android/iOS)',
    subtitle: 'Configuração completa do jogo + recomendações',
    priceBRL: 25,
    category: 'Configs',
    platforms: ['Android', 'iOS'],
    delivery: 'Entrega no mesmo dia',
    highlights: ['Config limpa', 'Recomendado por modelo', 'Fácil de aplicar'],
    includes: [
      'Config de gráficos (foco em estabilidade)',
      'Config de controles (base)',
      'Recomendações de armazenamento/otimização',
    ],
    description:
      'Uma base sólida e direta para melhorar consistência. Entrega pronta pra aplicar e começar a sentir diferença.',
  },
  {
    id: 'regedit-pc',
    slug: 'regedit-mouse-teclado',
    name: 'Regedit (Mouse/Teclado) — PC',
    subtitle: 'Ajustes de resposta e consistência no input',
    priceBRL: 30,
    category: 'Regedit',
    platforms: ['PC'],
    delivery: 'Agendamento (assistido) + entrega no dia',
    highlights: ['Input mais consistente', 'Setup mais “liso”', 'Backup incluído'],
    includes: [
      'Backup/restauração (segurança)',
      'Ajustes guiados e reversíveis',
      'Configuração de sensibilidade base',
      'Checklist de otimização do Windows (essencial)',
    ],
    description:
      'Pacote focado em consistência de input. Fazemos de forma assistida e com backup pra garantir segurança.',
  },
]

export function getProductBySlug(slug: string) {
  return products.find((p) => p.slug === slug)
}

export function getProductById(id: string) {
  return products.find((p) => p.id === id)
}

