export function getWhatsappNumber() {
  const n = import.meta.env.VITE_WHATSAPP_NUMBER as string | undefined
  return (n ?? '').replace(/\D/g, '')
}

export function buildWhatsAppLink(message: string) {
  const number = getWhatsappNumber()
  const encoded = encodeURIComponent(message)
  if (number) return `https://wa.me/${number}?text=${encoded}`
  return `https://wa.me/?text=${encoded}`
}

