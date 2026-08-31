import { MessageCircle } from 'lucide-react'
import { buildWhatsAppLink } from '../lib/whatsapp'

export function WhatsAppFloating() {
  const href = buildWhatsAppLink('Oi! Vim pelo site KittyFPS. Quero tirar uma dúvida / fazer um pedido.')

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="fixed bottom-5 right-5 z-50 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500 px-4 py-3 text-sm font-bold text-white shadow-[0_18px_55px_rgba(16,185,129,0.35)] transition-colors duration-200 hover:bg-emerald-600"
    >
      <MessageCircle className="h-5 w-5" />
      <span className="hidden sm:inline">Chamar no WhatsApp</span>
    </a>
  )
}
