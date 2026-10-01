// Validação da nova senha (pura). Não aplica trim: espaços fazem parte da senha.

export const MIN_PASSWORD_LENGTH = 8

export type PasswordCheck = { ok: true } | { ok: false; error: string }

export function validateNewPassword(password: string, confirmation: string): PasswordCheck {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, error: `A senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.` }
  }
  if (password !== confirmation) {
    return { ok: false, error: 'As senhas não coincidem.' }
  }
  return { ok: true }
}
