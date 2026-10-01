import { describe, expect, it } from 'vitest'
import {
  addMonths,
  getRotation,
  isPayerOverride,
  monthOfDate,
  monthStart,
  previousMonth,
  resolvePayer,
  rotationPayer,
} from '../lib/rotation'

const A = 'id-a'
const B = 'id-b'
const members: readonly [string, string] = [A, B]
const settings = { firstMonth: '2026-01-01', firstPayerId: A }

describe('rotationPayer', () => {
  it('o pagador inicial paga o mês inicial', () => {
    expect(rotationPayer('2026-01-01', settings, members)).toBe(A)
  })

  it('alterna a cada mês', () => {
    expect(rotationPayer('2026-02-01', settings, members)).toBe(B)
    expect(rotationPayer('2026-03-01', settings, members)).toBe(A)
    expect(rotationPayer('2026-10-01', settings, members)).toBe(B)
  })

  it('funciona quando o pagador inicial é o segundo da lista', () => {
    const s = { firstMonth: '2026-01-01', firstPayerId: B }
    expect(rotationPayer('2026-01-01', s, members)).toBe(B)
    expect(rotationPayer('2026-02-01', s, members)).toBe(A)
  })

  it('mantém a alternância na virada de ano', () => {
    expect(rotationPayer('2026-12-01', settings, members)).toBe(B) // 11 meses
    expect(rotationPayer('2027-01-01', settings, members)).toBe(A) // 12 meses
    expect(rotationPayer('2027-02-01', settings, members)).toBe(B)
  })

  it('funciona quando o mês inicial é dezembro', () => {
    const s = { firstMonth: '2025-12-01', firstPayerId: A }
    expect(rotationPayer('2025-12-01', s, members)).toBe(A)
    expect(rotationPayer('2026-01-01', s, members)).toBe(B)
    expect(rotationPayer('2026-02-01', s, members)).toBe(A)
  })

  it('continua alternando em meses anteriores ao inicial', () => {
    expect(rotationPayer('2025-12-01', settings, members)).toBe(B)
    expect(rotationPayer('2025-11-01', settings, members)).toBe(A)
    expect(rotationPayer('2025-01-01', settings, members)).toBe(A) // 12 meses antes
    expect(rotationPayer('2024-12-01', settings, members)).toBe(B) // 13 meses antes
  })

  it('aceita first_month fora do dia 1 e datas com qualquer dia', () => {
    const s = { firstMonth: '2026-01-15', firstPayerId: A }
    expect(rotationPayer('2026-02-28', s, members)).toBe(B)
  })

  it('rejeita configuração inconsistente e datas inválidas', () => {
    expect(() => rotationPayer('2026-01-01', { ...settings, firstPayerId: 'x' }, members)).toThrow()
    expect(() => rotationPayer('2026-01-01', settings, [A, A])).toThrow()
    expect(() => rotationPayer('2026-13-01', settings, members)).toThrow()
    expect(() => rotationPayer('janeiro', settings, members)).toThrow()
  })
})

describe('resolvePayer (pagador congelado no boleto)', () => {
  it('sem boleto, vale o rodízio', () => {
    expect(resolvePayer('2026-02-01', settings, members)).toBe(B)
    expect(resolvePayer('2026-02-01', settings, members, null)).toBe(B)
  })

  it('com boleto, vale sempre o payer_id gravado', () => {
    // coincide com o rodízio
    expect(resolvePayer('2026-02-01', settings, members, { payerId: B })).toBe(B)
    // difere do rodízio (troca de vez)
    expect(resolvePayer('2026-02-01', settings, members, { payerId: A })).toBe(A)
  })

  it('mudar os Ajustes não reescreve um mês que já tem boleto', () => {
    const frozen = { payerId: B } // fevereiro lançado com B (rodízio original)
    const changed = { firstMonth: '2026-01-01', firstPayerId: B } // rodízio agora inverte
    expect(resolvePayer('2026-02-01', changed, members, frozen)).toBe(B)
    // já um mês sem boleto passa a seguir o novo rodízio
    expect(resolvePayer('2026-03-01', changed, members)).toBe(B)
    expect(resolvePayer('2026-03-01', settings, members)).toBe(A)
  })

  it('a troca de um mês não altera os vizinhos', () => {
    const swapped = { payerId: A } // fevereiro trocado para A
    expect(resolvePayer('2026-02-01', settings, members, swapped)).toBe(A)
    // vizinhos sem boleto seguem o rodízio puro
    expect(resolvePayer('2026-01-01', settings, members)).toBe(A)
    expect(resolvePayer('2026-03-01', settings, members)).toBe(A)
    expect(resolvePayer('2026-04-01', settings, members)).toBe(B)
    // vizinho com boleto mantém o próprio pagador gravado
    expect(resolvePayer('2026-03-01', settings, members, { payerId: B })).toBe(B)
  })
})

describe('getRotation (estado parcial)', () => {
  const people = [{ id: A }, { id: B }]

  it('sem settings, não há rodízio', () => {
    expect(getRotation(people, null)).toBeNull()
    expect(getRotation(people, undefined)).toBeNull()
  })

  it('com um só membro (ou nenhum), não há rodízio', () => {
    expect(getRotation([{ id: A }], settings)).toBeNull()
    expect(getRotation([], settings)).toBeNull()
  })

  it('pagador inicial fora dos membros ou data malformada, não há rodízio', () => {
    expect(getRotation(people, { firstMonth: '2026-01-01', firstPayerId: 'x' })).toBeNull()
    expect(getRotation(people, { firstMonth: 'janeiro', firstPayerId: A })).toBeNull()
  })

  it('com settings e dois membros, devolve ids e configuração', () => {
    expect(getRotation(people, settings)).toEqual({ ids: [A, B], settings })
  })
})

describe('isPayerOverride', () => {
  it('é falso quando o escolhido é o do rodízio e verdadeiro quando difere', () => {
    expect(isPayerOverride('2026-02-01', B, settings, members)).toBe(false)
    expect(isPayerOverride('2026-02-01', A, settings, members)).toBe(true)
    expect(isPayerOverride('2027-01-01', A, settings, members)).toBe(false)
    expect(isPayerOverride('2027-01-01', B, settings, members)).toBe(true)
  })
})

describe('utilitários de mês', () => {
  it('monthStart normaliza para o dia 1', () => {
    expect(monthStart('2026-07-23')).toBe('2026-07-01')
    expect(monthStart('2026-07')).toBe('2026-07-01')
  })

  it('previousMonth e addMonths cruzam o ano', () => {
    expect(previousMonth('2026-01-01')).toBe('2025-12-01')
    expect(previousMonth('2026-10-01')).toBe('2026-09-01')
    expect(addMonths('2026-11-01', 3)).toBe('2027-02-01')
    expect(addMonths('2026-02-01', -14)).toBe('2024-12-01')
  })

  it('monthOfDate usa o calendário local', () => {
    expect(monthOfDate(new Date(2026, 11, 31, 23, 59))).toBe('2026-12-01')
    expect(monthOfDate(new Date(2027, 0, 1, 0, 0))).toBe('2027-01-01')
  })
})
