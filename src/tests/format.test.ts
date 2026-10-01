import { describe, expect, it } from 'vitest'
import {
  capitalize,
  formatBRL,
  formatDate,
  formatDayMonth,
  monthName,
  monthYearLabel,
} from '../lib/format'

// O Intl usa espaço não separável entre "R$" e o número; normalizamos para comparar.
const plain = (s: string) => s.replace(/ /g, ' ')

describe('formatBRL', () => {
  it('formata em reais no padrão brasileiro', () => {
    expect(plain(formatBRL(180))).toBe('R$ 180,00')
    expect(plain(formatBRL(1234.5))).toBe('R$ 1.234,50')
    expect(plain(formatBRL(0.9))).toBe('R$ 0,90')
  })
})

describe('datas', () => {
  it('formatDayMonth e formatDate', () => {
    expect(formatDayMonth('2026-10-10')).toBe('10/10')
    expect(formatDate('2026-01-05')).toBe('05/01/2026')
  })

  it('rejeita data inválida', () => {
    expect(() => formatDayMonth('hoje')).toThrow()
    expect(() => formatDate('2026/10/10')).toThrow()
  })
})

describe('nomes de mês', () => {
  it('monthName e monthYearLabel', () => {
    expect(monthName('2026-09-01')).toBe('setembro')
    expect(monthName('2026-03')).toBe('março')
    expect(monthYearLabel('2026-10-01')).toBe('Outubro de 2026')
    expect(monthYearLabel('2027-01-01')).toBe('Janeiro de 2027')
  })

  it('rejeita mês inválido', () => {
    expect(() => monthName('2026-13-01')).toThrow()
  })

  it('capitalize', () => {
    expect(capitalize('setembro')).toBe('Setembro')
    expect(capitalize('')).toBe('')
  })
})
