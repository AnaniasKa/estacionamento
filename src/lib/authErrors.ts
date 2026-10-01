// Tradução de erros de autenticação para uma frase simples (pura, sem importar o Supabase).

export interface AuthErrorLike {
  message?: string
  status?: number
  code?: string
  name?: string
}

export function isNetworkError(e: AuthErrorLike): boolean {
  return (
    e.name === 'AuthRetryableFetchError' ||
    e.status === 0 ||
    /failed to fetch|network|load failed/i.test(e.message ?? '')
  )
}

export function loginErrorMessage(e: AuthErrorLike): string {
  if (isNetworkError(e)) return 'Sem conexão. Tente de novo.'
  if (e.code === 'invalid_credentials' || /invalid login credentials/i.test(e.message ?? '')) {
    return 'E-mail ou senha incorretos.'
  }
  if (e.status === 429 || e.code === 'over_request_rate_limit') {
    return 'Muitas tentativas. Aguarde um pouco e tente de novo.'
  }
  return 'Não foi possível entrar. Tente de novo.'
}

export function passwordErrorMessage(e: AuthErrorLike): string {
  if (isNetworkError(e)) return 'Sem conexão. Tente de novo.'
  if (e.code === 'same_password') return 'A nova senha deve ser diferente da atual.'
  if (e.code === 'weak_password') return 'Senha fraca. Escolha uma senha mais difícil de adivinhar.'
  if (e.code === 'reauthentication_needed') return 'Saia e entre de novo para alterar a senha.'
  return 'Não foi possível alterar a senha. Tente de novo.'
}
