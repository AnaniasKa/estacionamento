import { describe, expect, it } from 'vitest'
import { formatBarcode, validateBarcode } from '../lib/barcode'

// Dígitos sintéticos, sem relação com boletos reais.
const d47 = '1234567890'.repeat(5).slice(0, 47)
const d48 = '1234567890'.repeat(5).slice(0, 48)

describe('validateBarcode', () => {
  it('aceita 47 dígitos puros', () => {
    expect(validateBarcode(d47)).toEqual({ ok: true, digits: d47 })
  })

  it('aceita 48 dígitos puros', () => {
    expect(validateBarcode(d48)).toEqual({ ok: true, digits: d48 })
  })

  it('limpa pontos e espaços', () => {
    const masked = `${d47.slice(0, 5)}.${d47.slice(5, 10)} ${d47.slice(10, 16)}.${d47.slice(16)}`
    expect(validateBarcode(masked)).toEqual({ ok: true, digits: d47 })
  })

  it('ignora espaços nas pontas e quebras de linha coladas', () => {
    expect(validateBarcode(`  ${d48.slice(0, 24)}\n${d48.slice(24)}  `)).toEqual({
      ok: true,
      digits: d48,
    })
  })

  it('rejeita tamanhos diferentes de 47 e 48', () => {
    for (const n of [1, 46, 49, 44]) {
      const r = validateBarcode('1'.repeat(n))
      expect(r.ok).toBe(false)
    }
    const r = validateBarcode(d47.slice(0, 46))
    expect(r).toEqual({
      ok: false,
      error: 'A linha digitável deve ter 47 ou 48 dígitos (tem 46).',
    })
  })

  it('explica que 44 dígitos é o código de barras e pede a linha digitável', () => {
    const r = validateBarcode('1'.repeat(44))
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.error).toContain('código de barras')
      expect(r.error).toContain('44')
      expect(r.error).toContain('linha digitável')
      expect(r.error).toContain('47 ou 48')
    }
  })

  it('rejeita vazio', () => {
    expect(validateBarcode('').ok).toBe(false)
    expect(validateBarcode('   ').ok).toBe(false)
  })

  it('rejeita letras e símbolos em vez de descartá-los em silêncio', () => {
    expect(validateBarcode(`${d47.slice(0, 46)}x`).ok).toBe(false)
    expect(validateBarcode(`${d47}-`).ok).toBe(false)
  })
})

describe('formatBarcode', () => {
  it('agrupa em blocos de 5 sem espaço sobrando no fim', () => {
    expect(formatBarcode('1234567890123')).toBe('12345 67890 123')
    expect(formatBarcode('12345')).toBe('12345')
  })
})
