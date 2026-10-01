import { describe, expect, it } from 'vitest'
import { loginErrorMessage, passwordErrorMessage } from '../lib/authErrors'

describe('loginErrorMessage', () => {
  it('credenciais inválidas', () => {
    expect(loginErrorMessage({ code: 'invalid_credentials', status: 400 })).toBe('E-mail ou senha incorretos.')
    expect(loginErrorMessage({ message: 'Invalid login credentials', status: 400 })).toBe(
      'E-mail ou senha incorretos.',
    )
  })

  it('erro de rede', () => {
    expect(loginErrorMessage({ name: 'AuthRetryableFetchError', status: 0 })).toBe('Sem conexão. Tente de novo.')
    expect(loginErrorMessage({ message: 'Failed to fetch' })).toBe('Sem conexão. Tente de novo.')
  })

  it('limite de tentativas', () => {
    expect(loginErrorMessage({ status: 429 })).toBe('Muitas tentativas. Aguarde um pouco e tente de novo.')
  })

  it('qualquer outro erro vira uma frase genérica, sem expor a mensagem técnica', () => {
    expect(loginErrorMessage({ message: 'boom interno', status: 500 })).toBe(
      'Não foi possível entrar. Tente de novo.',
    )
  })
})

describe('passwordErrorMessage', () => {
  it('casos conhecidos', () => {
    expect(passwordErrorMessage({ code: 'same_password' })).toBe('A nova senha deve ser diferente da atual.')
    expect(passwordErrorMessage({ code: 'weak_password' })).toContain('Senha fraca')
    expect(passwordErrorMessage({ code: 'reauthentication_needed' })).toBe(
      'Saia e entre de novo para alterar a senha.',
    )
    expect(passwordErrorMessage({ message: 'Failed to fetch' })).toBe('Sem conexão. Tente de novo.')
  })

  it('erro desconhecido vira frase genérica', () => {
    expect(passwordErrorMessage({ message: 'x', status: 500 })).toBe(
      'Não foi possível alterar a senha. Tente de novo.',
    )
  })
})
