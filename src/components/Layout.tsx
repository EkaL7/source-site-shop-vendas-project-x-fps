import type { ReactNode } from 'react'
import { TopNav } from './TopNav'
import { Footer } from './Footer'
import { WhatsAppFloating } from './WhatsAppFloating'
import { useDiscordMembership } from '../hooks/useDiscordMembership'

export function Layout({ children }: { children: ReactNode }) {
  // Roda em background pra todo usuário logado: se ele sair do servidor
  // do Discord, o hook força signOut automaticamente.
  useDiscordMembership({ kickOnLeave: true })

  return (
    <div className="min-h-screen">
      <TopNav />
      <main>{children}</main>
      <Footer />
      <WhatsAppFloating />
    </div>
  )
}
