import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

type AuthContextType = {
  user: User | null
  session: Session | null
  isLoading: boolean
  signInWithDiscord: () => Promise<void>
  signOut: () => Promise<void>
  /** Promise pendente do add-to-guild atual. Hook de membership awaits isso
   * antes de checar, evitando race condition de "logou mas bot ainda não viu". */
  addToGuildPromise: Promise<void> | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

/**
 * Chama a Edge Function discord-add-to-guild com o provider_token (Discord OAuth
 * access_token) recém-emitido pelo Supabase. Roda só uma vez por sessão.
 */
async function addUserToGuild(session: Session) {
  if (!session.provider_token || !session.user?.id) return
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string
  if (!supabaseUrl || !anonKey) return

  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/discord-add-to-guild`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${anonKey}`,
      },
      body: JSON.stringify({
        userId: session.user.id,
        providerToken: session.provider_token,
      }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => null)
      console.warn('discord-add-to-guild falhou', res.status, data)
    }
  } catch (err) {
    console.warn('discord-add-to-guild erro de rede', err)
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [addToGuildPromise, setAddToGuildPromise] = useState<Promise<void> | null>(null)

  // Evita chamar add-to-guild múltiplas vezes na mesma sessão.
  const addedToGuildForUser = useRef<string | null>(null)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setIsLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setIsLoading(false)

      // Só chama add-to-guild quando o usuário acabou de fazer SIGN_IN
      // (e ainda temos o provider_token — ele expira depois).
      if (event === 'SIGNED_IN' && session?.provider_token && session.user?.id) {
        if (addedToGuildForUser.current !== session.user.id) {
          addedToGuildForUser.current = session.user.id
          const p = addUserToGuild(session).finally(() => {
            // limpa a promise quando termina, pra não segurar referência
            setAddToGuildPromise((curr) => (curr === p ? null : curr))
          })
          setAddToGuildPromise(p)
        }
      }
      if (event === 'SIGNED_OUT') {
        addedToGuildForUser.current = null
        setAddToGuildPromise(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signInWithDiscord = async () => {
    setIsLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: {
        // identify+email = padrão do Supabase. guilds.join = permite o BOT
        // adicionar o usuário ao servidor via OAuth access_token.
        scopes: 'identify email guilds.join',
        redirectTo: window.location.origin + '/checkout',
      },
    })
    if (error) {
      console.error('Error signing in:', error)
      setIsLoading(false)
    }
  }

  const signOut = async () => {
    setIsLoading(true)
    await supabase.auth.signOut()
    setIsLoading(false)
  }

  return (
    <AuthContext.Provider
      value={{ user, session, isLoading, signInWithDiscord, signOut, addToGuildPromise }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
