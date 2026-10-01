import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session } from '@supabase/supabase-js'
import { NO_ACCESS_MESSAGE, decideAccess, type AccessDecision, type MemberStatus } from '../lib/access'
import { supabase } from '../lib/supabase'
import type { Member } from '../lib/types'

interface AuthState {
  session: Session | null
  /** Linha de members do usuário logado (só existe quando decision = 'allowed'). */
  member: Member | null
  decision: AccessDecision
  /** Mensagem a mostrar no login (ex.: e-mail sem acesso). */
  notice: string | null
  clearNotice: () => void
  /** Repete a consulta a members depois de uma falha. */
  retryMember: () => void
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [initializing, setInitializing] = useState(true)
  const [member, setMember] = useState<Member | null>(null)
  const [memberStatus, setMemberStatus] = useState<MemberStatus>('idle')
  const [notice, setNotice] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  // Restaura a sessão salva e acompanha login/logout/refresh.
  useEffect(() => {
    let active = true
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (active) setSession(data.session)
      })
      .catch(() => {})
      .finally(() => {
        if (active) setInitializing(false)
      })
    // O callback só guarda a sessão: não chama o Supabase de dentro dele.
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next))
    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [])

  // Confere se o usuário logado é membro. Refrescos de token não refazem a consulta (mesmo id).
  const userId = session?.user.id ?? null
  useEffect(() => {
    if (!userId) {
      setMember(null)
      setMemberStatus('idle')
      return
    }
    let cancelled = false
    setMemberStatus('loading')
    supabase
      .from('members')
      .select('id, name, email, phone')
      .eq('id', userId)
      .maybeSingle()
      .then(
        ({ data, error }) => {
          if (cancelled) return
          if (error) {
            setMemberStatus('error')
          } else if (!data) {
            setMember(null)
            setMemberStatus('missing')
            setNotice(NO_ACCESS_MESSAGE)
            void supabase.auth.signOut()
          } else {
            setMember(data as Member)
            setMemberStatus('found')
          }
        },
        () => {
          if (!cancelled) setMemberStatus('error')
        },
      )
    return () => {
      cancelled = true
    }
  }, [userId, attempt])

  const clearNotice = useCallback(() => setNotice(null), [])
  const retryMember = useCallback(() => setAttempt((n) => n + 1), [])

  const value = useMemo<AuthState>(
    () => ({
      session,
      member,
      decision: decideAccess({ initializing, hasSession: session !== null, memberStatus }),
      notice,
      clearNotice,
      retryMember,
    }),
    [session, member, initializing, memberStatus, notice, clearNotice, retryMember],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useSession(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useSession precisa estar dentro de AuthProvider')
  return ctx
}
