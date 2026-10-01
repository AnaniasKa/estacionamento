import { loginErrorMessage, passwordErrorMessage } from './authErrors'
import { supabase } from './supabase'
import { validateNewPassword } from './password'

/** Resultado simples: error é uma frase pronta para a tela, ou null se deu certo. */
export interface AuthResult {
  error: string | null
}

// Nenhuma destas funções registra e-mail, senha ou token no console.

export async function signIn(email: string, password: string): Promise<AuthResult> {
  try {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })
    return { error: error ? loginErrorMessage(error) : null }
  } catch (e) {
    return { error: loginErrorMessage(e as Error) }
  }
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut()
}

export async function changePassword(password: string, confirmation: string): Promise<AuthResult> {
  const check = validateNewPassword(password, confirmation)
  if (!check.ok) return { error: check.error }
  try {
    const { error } = await supabase.auth.updateUser({ password })
    return { error: error ? passwordErrorMessage(error) : null }
  } catch (e) {
    return { error: passwordErrorMessage(e as Error) }
  }
}
