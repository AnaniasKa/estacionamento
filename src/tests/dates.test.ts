import { describe, expect, it } from 'vitest'
import { daysBetween, localDateOfTimestamp, todayLocal } from '../lib/dates'

describe('todayLocal', () => {
  it('usa o calendário local, com zeros à esquerda', () => {
    expect(todayLocal(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05')
    expect(todayLocal(new Date(2026, 11, 31, 0, 0))).toBe('2026-12-31')
  })
})

describe('daysBetween', () => {
  it('conta dias inteiros, com sinal', () => {
    expect(daysBetween('2026-10-01', '2026-10-10')).toBe(9)
    expect(daysBetween('2026-10-10', '2026-10-01')).toBe(-9)
    expect(daysBetween('2026-10-10', '2026-10-10')).toBe(0)
  })

  it('atravessa mês, ano e fevereiro bissexto', () => {
    expect(daysBetween('2026-12-31', '2027-01-01')).toBe(1)
    expect(daysBetween('2028-02-28', '2028-03-01')).toBe(2)
    expect(daysBetween('2027-02-28', '2027-03-01')).toBe(1)
  })
})

describe('localDateOfTimestamp', () => {
  it('devolve a data local do instante, independente do fuso da máquina', () => {
    const local = new Date(2026, 9, 5, 10, 30)
    expect(localDateOfTimestamp(local.toISOString())).toBe('2026-10-05')
    const lateNight = new Date(2026, 9, 5, 23, 50)
    expect(localDateOfTimestamp(lateNight.toISOString())).toBe('2026-10-05')
  })
})
