// Decisão de acesso, pura (sem Supabase): o que a rota deve fazer dado o estado da sessão.

/** Resultado da consulta à tabela members para o usuário logado. */
export type MemberStatus = 'idle' | 'loading' | 'found' | 'missing' | 'error'

export type AccessDecision =
  | 'loading' // restaurando sessão ou consultando members: mostrar carregamento
  | 'login' // sem sessão, ou sessão sem membro (nesse caso já houve signOut): ir para /login
  | 'allowed' // sessão válida e membro encontrado
  | 'error' // não deu para confirmar o acesso (ex.: sem rede): não desloga, oferece tentar de novo

export interface AccessInput {
  initializing: boolean
  hasSession: boolean
  memberStatus: MemberStatus
}

export function decideAccess({ initializing, hasSession, memberStatus }: AccessInput): AccessDecision {
  if (initializing) return 'loading'
  if (!hasSession) return 'login'
  switch (memberStatus) {
    case 'found':
      return 'allowed'
    case 'missing':
      return 'login'
    case 'error':
      return 'error'
    default:
      return 'loading'
  }
}

export const NO_ACCESS_MESSAGE = 'Este e-mail não tem acesso ao app.'
