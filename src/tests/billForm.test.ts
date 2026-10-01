import { describe, expect, it } from 'vitest'
import {
  amountToInput,
  isValidIsoDate,
  MAX_PDF_BYTES,
  parseAmount,
  pdfFileError,
  validateBillForm,
} from '../lib/billForm'

const A = '11111111-1111-1111-1111-111111111111'
const B = '22222222-2222-2222-2222-222222222222'
const LINE47 = '1'.repeat(47)

describe('parseAmount', () => {
  it.each([
    ['123,45', 123.45],
    ['1.234,56', 1234.56],
    ['1234.56', 1234.56],
    ['R$ 1.234,56', 1234.56],
    ['1.234', 1234],
    ['50', 50],
    ['0,5', 0.5],
  ])('aceita %s', (input, value) => {
    expect(parseAmount(input)).toEqual({ ok: true, value })
  })

  it.each(['', 'abc', '0', '0,00', '1,2,3', '12,345', '1.23.4', '-5', '1e3'])('rejeita "%s"', (input) => {
    expect(parseAmount(input).ok).toBe(false)
  })

  it('formata para o campo', () => {
    expect(amountToInput(1234.5)).toBe('1234,50')
  })
})

describe('isValidIsoDate', () => {
  it('valida o calendário', () => {
    expect(isValidIsoDate('2026-10-10')).toBe(true)
    expect(isValidIsoDate('2028-02-29')).toBe(true)
    expect(isValidIsoDate('2026-02-29')).toBe(false)
    expect(isValidIsoDate('2026-13-01')).toBe(false)
    expect(isValidIsoDate('')).toBe(false)
  })
})

describe('pdfFileError', () => {
  it('aceita PDF dentro do limite', () => {
    expect(pdfFileError({ type: 'application/pdf', size: 1000, name: 'a.pdf' })).toBeNull()
    expect(pdfFileError({ type: 'application/pdf', size: MAX_PDF_BYTES, name: 'a.pdf' })).toBeNull()
  })
  it('rejeita outro tipo, vazio e grande demais', () => {
    expect(pdfFileError({ type: 'image/png', size: 10, name: 'a.png' })).not.toBeNull()
    expect(pdfFileError({ type: 'application/pdf', size: 0, name: 'a.pdf' })).not.toBeNull()
    expect(pdfFileError({ type: 'application/pdf', size: MAX_PDF_BYTES + 1, name: 'a.pdf' })).not.toBeNull()
  })
})

describe('validateBillForm', () => {
  const base = { month: '2026-10', payerId: A, amount: '123,45', dueDate: '2026-10-10', barcode: '' }

  it('aceita sem linha digitável quando há PDF', () => {
    expect(validateBillForm(base, [A, B], true)).toEqual({
      ok: true,
      values: { amount: 123.45, dueDate: '2026-10-10', barcode: null },
    })
  })

  it('guarda só os dígitos da linha digitável', () => {
    const spaced = LINE47.replace(/(\d{5})/g, '$1 ')
    const r = validateBillForm({ ...base, barcode: spaced }, [A, B], false)
    expect(r.ok && r.values.barcode).toBe(LINE47)
  })

  it('exige linha digitável ou PDF', () => {
    const r = validateBillForm(base, [A, B], false)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors.content).toBe('Informe a linha digitável ou anexe o PDF.')
  })

  it('só linha digitável basta; só PDF basta', () => {
    expect(validateBillForm({ ...base, barcode: LINE47 }, [A, B], false).ok).toBe(true)
    expect(validateBillForm(base, [A, B], true).ok).toBe(true)
  })

  it('edição: apagar a linha digitável sem PDF é bloqueado; com PDF mantido, passa', () => {
    expect(validateBillForm({ ...base, barcode: '  ' }, [A, B], false).ok).toBe(false)
    expect(validateBillForm({ ...base, barcode: '  ' }, [A, B], true).ok).toBe(true)
  })

  it('linha digitável inválida dá erro próprio, não o de conteúdo', () => {
    const r = validateBillForm({ ...base, barcode: '123' }, [A, B], false)
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.errors.barcode).toBeDefined()
      expect(r.errors.content).toBeUndefined()
    }
  })

  it('junta os erros dos campos', () => {
    const r = validateBillForm({ month: '', payerId: 'x', amount: '', dueDate: '', barcode: '123' }, [A, B], true)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(['amount', 'barcode', 'dueDate', 'month', 'payerId'])
  })
})
