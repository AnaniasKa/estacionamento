import { describe, expect, it } from 'vitest'
import { validateNewPassword } from '../lib/password'

describe('validateNewPassword', () => {
  it('aceita 8 caracteres ou mais com confirmação igual', () => {
    expect(validateNewPassword('abcdefgh', 'abcdefgh')).toEqual({ ok: true })
    expect(validateNewPassword('uma senha longa 123', 'uma senha longa 123')).toEqual({ ok: true })
  })

  it('rejeita menos de 8 caracteres', () => {
    const r = validateNewPassword('abcdefg', 'abcdefg')
    expect(r).toEqual({ ok: false, error: 'A senha deve ter pelo menos 8 caracteres.' })
  })

  it('rejeita confirmação diferente', () => {
    expect(validateNewPassword('abcdefgh', 'abcdefgH')).toEqual({
      ok: false,
      error: 'As senhas não coincidem.',
    })
  })

  it('o tamanho é checado antes da confirmação', () => {
    expect(validateNewPassword('abc', 'xyz')).toEqual({
      ok: false,
      error: 'A senha deve ter pelo menos 8 caracteres.',
    })
  })

  it('não remove espaços: oito espaços contam como senha de 8 caracteres', () => {
    expect(validateNewPassword('        ', '        ')).toEqual({ ok: true })
  })
})
