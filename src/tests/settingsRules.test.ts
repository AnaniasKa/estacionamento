import { describe, expect, it } from 'vitest'
import {
  canSwapPayer,
  normalizeFirstMonth,
  normalizePhone,
  payerChange,
  swappableBills,
  validateName,
} from '../lib/settingsRules'

const A = '11111111-1111-1111-1111-111111111111'
const B = '22222222-2222-2222-2222-222222222222'
const settings = { firstMonth: '2026-10-01', firstPayerId: B } // outubro: B; novembro: A; dezembro: B

describe('normalizePhone', () => {
  it('grava só os dígitos, com ou sem máscara', () => {
    expect(normalizePhone('5511999999999')).toEqual({ ok: true, phone: '5511999999999' })
    expect(normalizePhone('+55 (11) 99999-9999')).toEqual({ ok: true, phone: '5511999999999' })
    expect(normalizePhone('  (11) 3333-4444 ')).toEqual({ ok: true, phone: '1133334444' })
  })
  it('vazio vira null', () => {
    expect(normalizePhone('')).toEqual({ ok: true, phone: null })
    expect(normalizePhone('   ')).toEqual({ ok: true, phone: null })
  })
  it('rejeita curto, longo e letras', () => {
    expect(normalizePhone('123456789').ok).toBe(false) // 9 dígitos
    expect(normalizePhone('1234567890123456').ok).toBe(false) // 16 dígitos
    expect(normalizePhone('55119999abcde').ok).toBe(false)
    expect(normalizePhone('11 99999-9999 ramal 2').ok).toBe(false)
  })
  it('aceita os limites 10 e 15 dígitos', () => {
    expect(normalizePhone('1234567890').ok).toBe(true)
    expect(normalizePhone('123456789012345').ok).toBe(true)
  })
})

describe('validateName', () => {
  it('apara as pontas e exige conteúdo', () => {
    expect(validateName('  Ana  ')).toEqual({ ok: true, name: 'Ana' })
    expect(validateName('').ok).toBe(false)
    expect(validateName('   ').ok).toBe(false)
  })
})

describe('normalizeFirstMonth', () => {
  it('leva para o dia 01', () => {
    expect(normalizeFirstMonth('2026-10')).toBe('2026-10-01')
    expect(normalizeFirstMonth('2026-10-17')).toBe('2026-10-01')
    expect(normalizeFirstMonth('2026-10-01')).toBe('2026-10-01')
  })
  it('rejeita o que não é mês', () => {
    expect(normalizeFirstMonth('')).toBeNull()
    expect(normalizeFirstMonth('2026-13')).toBeNull()
    expect(normalizeFirstMonth('outubro')).toBeNull()
  })
})

describe('troca de vez', () => {
  it('só pendente e vencido (status pending) permitem; pago não', () => {
    expect(canSwapPayer({ status: 'pending' })).toBe(true)
    expect(canSwapPayer({ status: 'paid' })).toBe(false)
  })
  it('lista só os elegíveis, mais recentes primeiro', () => {
    const bills = [
      { month: '2026-09-01', status: 'paid' as const },
      { month: '2026-10-01', status: 'pending' as const },
      { month: '2026-08-01', status: 'pending' as const },
    ]
    expect(swappableBills(bills).map((b) => b.month)).toEqual(['2026-10-01', '2026-08-01'])
  })
  it('payer_override compara com o rodízio do mês', () => {
    // Outubro é do B no rodízio.
    expect(payerChange('2026-10-01', B, settings, [A, B])).toEqual({ payerId: B, payerOverride: false })
    expect(payerChange('2026-10-01', A, settings, [A, B])).toEqual({ payerId: A, payerOverride: true })
    // Novembro é do A: escolher A volta a ser o rodízio.
    expect(payerChange('2026-11-01', A, settings, [A, B])).toEqual({ payerId: A, payerOverride: false })
  })
})
