import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

type State = {
  /** undefined = ainda checando · true/false = resultado da última verificação */
  isMember: boolean | undefined
  /** True enquanto a request da Edge Function está rodando. */
  checking: boolean
  /** Última verificação bem-sucedida (timestamp). */
  lastCheckedAt: number | null
}

// Após login, dar tempo pro discord-add-to-guild rodar antes do primeiro check.
// 8s é folgado o suficiente pra cobrir Edge Function cold start + Discord API.
const INITIAL_CHECK_DELAY_MS = 8 * 1000
// Se a primeira tentativa der "não está no server", esperar X e tentar de novo
// antes de derrubar a sessão. Cobre flutuação de rede ou Discord propagation lag.
const RETRY_DELAY_MS = 5 * 1000
const MAX_RETRIES = 2

const CHECK_INTERVAL_MS = 5 * 60 * 1000 // 5 min em background
const ON_FOCUS_DEBOUNCE_MS = 30 * 1000

const DEBUG = true
function log(...args: unknown[]) {
  if (DEBUG) console.log('[useDiscordMembership]', ...args)
}

/**
 * Verifica periodicamente (e em momentos críticos) se o usuário ainda está no
 * servidor Discord. Se sair, força signOut e o frontend redireciona pra login.
 *
 * Use em páginas críticas: <Layout> (global), Checkout, Dashboard.
 */
export function useDiscordMembership(options?: { kickOnLeave?: boolean }) {
  const { user, signOut, addToGuildPromise } = useAuth()
  const [state, setState] = useState<State>({
    isMember: undefined,
    checking: false,
    lastCheckedAt: null,
  })
  const inflightRef = useRef<Promise<boolean | null> | null>(null)
  const lastCheckedAtRef = useRef<number | null>(null)
  const kickOnLeave = options?.kickOnLeave ?? true

  /**
   * Faz UMA chamada à Edge Function, sem retry e sem kick.
   * Retorna: true=membro · false=não membro · null=erro de rede/server.
   */
  const checkOnce = async (): Promise<boolean | null> => {
    if (!user) return null
    if (inflightRef.current) return inflightRef.current

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string
    if (!supabaseUrl || !anonKey) return null

    setState((s) => ({ ...s, checking: true }))

    const promise = (async () => {
      try {
        const res = await fetch(`${supabaseUrl}/functions/v1/discord-check-membership`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${anonKey}`,
          },
          body: JSON.stringify({ userId: user.id }),
        })
        if (!res.ok) {
          log('check HTTP error', res.status)
          setState((s) => ({ ...s, checking: false }))
          return null
        }
        const data = (await res.json().catch(() => null)) as { isMember?: boolean } | null
        const now = Date.now()
        lastCheckedAtRef.current = now
        const isMember = Boolean(data?.isMember)
        setState({ isMember, checking: false, lastCheckedAt: now })
        log('check result', { isMember })
        return isMember
      } catch (err) {
        log('check fetch error', err)
        setState((s) => ({ ...s, checking: false }))
        return null
      } finally {
        inflightRef.current = null
      }
    })()
    inflightRef.current = promise
    return promise
  }

  /**
   * Wrapper "kick-aware": faz checkOnce + se falhar, tenta de novo até MAX_RETRIES.
   * Só derruba a sessão depois de TODAS as tentativas darem isMember=false.
   */
  const checkWithRetryAndKick = async () => {
    if (!user) return
    let result = await checkOnce()
    let attempt = 0
    while (result !== true && attempt < MAX_RETRIES) {
      attempt++
      log(`check retry ${attempt}/${MAX_RETRIES} em ${RETRY_DELAY_MS}ms`)
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS))
      result = await checkOnce()
    }
    if (result === false && kickOnLeave) {
      log('user fora do server após retries — fazendo signOut')
      await signOut()
    } else if (result === null) {
      log('check falhou (rede/server) — não derrubando sessão')
    }
  }

  // Após user logar, espera o add-to-guild terminar (se estiver rodando)
  // E TAMBÉM um delay mínimo, antes de fazer o primeiro check.
  useEffect(() => {
    if (!user) return
    let cancelled = false

    ;(async () => {
      // 1. Se há um add-to-guild em andamento, espera ele terminar.
      if (addToGuildPromise) {
        log('aguardando addToGuildPromise antes do primeiro check')
        try { await addToGuildPromise } catch { /* ignora erro */ }
      }
      if (cancelled) return

      // 2. Mesmo após terminar, dá um delay mínimo pra propagação no Discord.
      log('agendando primeiro check em', INITIAL_CHECK_DELAY_MS, 'ms')
      await new Promise((r) => setTimeout(r, INITIAL_CHECK_DELAY_MS))
      if (cancelled) return

      checkWithRetryAndKick()
    })()

    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, addToGuildPromise])

  // Re-checa periodicamente.
  useEffect(() => {
    if (!user) return
    const id = setInterval(() => checkWithRetryAndKick(), CHECK_INTERVAL_MS)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  // Re-checa quando a aba volta ao foco (com debounce).
  useEffect(() => {
    if (!user) return
    const onFocus = () => {
      const last = lastCheckedAtRef.current
      if (last && Date.now() - last < ON_FOCUS_DEBOUNCE_MS) return
      checkWithRetryAndKick()
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  return { ...state, recheck: checkWithRetryAndKick }
}
