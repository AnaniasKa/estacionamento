// Regras puras do formulário de boleto: valor em reais, data de vencimento, PDF e validação geral.
import { validateBarcode } from './barcode'

export const MAX_PDF_BYTES = 5 * 1024 * 1024 // mesmo limite do bucket "boletos"

export type AmountResult = { ok: true; value: number } | { ok: false; error: string }

/**
 * Valor em reais digitado à mão: aceita "1234,56", "1.234,56", "1234.56" e "R$ 1.234,56".
 * Sem vírgula, ponto seguido de exatamente 3 dígitos conta como milhar; o resto, como decimal.
 */
export function parseAmount(input: string): AmountResult {
  const text = input.replace(/R\$/gi, '').replace(/\s/g, '')
  if (text === '') return { ok: false, error: 'Informe o valor.' }
  if (!/^[\d.,]+$/.test(text)) return { ok: false, error: 'Use apenas números, vírgula e ponto.' }

  let normalized: string
  if (text.includes(',')) {
    // Vírgula é o decimal; pontos antes dela são milhar.
    if (text.indexOf(',') !== text.lastIndexOf(',')) return { ok: false, error: 'Valor inválido.' }
    const [int, dec] = text.split(',')
    if (!/^\d{1,3}(\.\d{3})+$|^\d+$/.test(int) || !/^\d{1,2}$/.test(dec)) {
      return { ok: false, error: 'Valor inválido.' }
    }
    normalized = `${int.replace(/\./g, '')}.${dec}`
  } else if (/^\d{1,3}(\.\d{3})+$/.test(text)) {
    normalized = text.replace(/\./g, '') // "1.234" = mil duzentos e trinta e quatro
  } else if (/^\d+(\.\d{1,2})?$/.test(text)) {
    normalized = text
  } else {
    return { ok: false, error: 'Valor inválido.' }
  }

  const value = Number(normalized)
  if (!Number.isFinite(value) || value <= 0) return { ok: false, error: 'O valor deve ser maior que zero.' }
  if (value >= 100_000_000) return { ok: false, error: 'Valor alto demais.' }
  return { ok: true, value }
}

/** Número para o campo de texto: 1234.5 -> "1234,50". */
export function amountToInput(value: number): string {
  return value.toFixed(2).replace('.', ',')
}

/** 'YYYY-MM-DD' que existe no calendário (rejeita 2026-02-31). */
export function isValidIsoDate(value: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!m) return false
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const date = new Date(Date.UTC(y, mo - 1, d))
  return date.getUTCFullYear() === y && date.getUTCMonth() === mo - 1 && date.getUTCDate() === d
}

/** Erro do arquivo escolhido, ou null se pode enviar. */
export function pdfFileError(file: { type: string; size: number; name: string }): string | null {
  const isPdf = file.type === 'application/pdf' || (file.type === '' && /\.pdf$/i.test(file.name))
  if (!isPdf) return 'O arquivo precisa ser um PDF.'
  if (file.size === 0) return 'O PDF está vazio.'
  if (file.size > MAX_PDF_BYTES) return 'O PDF é maior que 5 MB.'
  return null
}

export interface BillFormInput {
  month: string // 'YYYY-MM' (campo type=month) ou 'YYYY-MM-01'
  payerId: string
  amount: string
  dueDate: string
  barcode: string
}

export interface BillFormValues {
  amount: number
  dueDate: string
  barcode: string | null
}

export type BillFormErrors = Partial<
  Record<'month' | 'payerId' | 'amount' | 'dueDate' | 'barcode' | 'content', string>
>

export const CONTENT_REQUIRED_MESSAGE = 'Informe a linha digitável ou anexe o PDF.'

/**
 * `hasPdf` é o estado FINAL do anexo: PDF novo escolhido ou PDF já existente mantido.
 * Precisa sobrar pelo menos a linha digitável ou o PDF.
 */
export function validateBillForm(
  input: BillFormInput,
  memberIds: readonly string[],
  hasPdf: boolean,
): { ok: true; values: BillFormValues } | { ok: false; errors: BillFormErrors } {
  const errors: BillFormErrors = {}

  if (!/^\d{4}-(0[1-9]|1[0-2])(-01)?$/.test(input.month)) errors.month = 'Escolha o mês.'
  if (!memberIds.includes(input.payerId)) errors.payerId = 'Escolha quem paga.'

  const amount = parseAmount(input.amount)
  if (!amount.ok) errors.amount = amount.error

  if (!isValidIsoDate(input.dueDate)) errors.dueDate = 'Informe a data de vencimento.'

  // Se a linha digitável vier, tem que ser válida; se não vier, o PDF precisa existir.
  let barcode: string | null = null
  if (input.barcode.trim() !== '') {
    const result = validateBarcode(input.barcode)
    if (result.ok) barcode = result.digits
    else errors.barcode = result.error
  } else if (!hasPdf) {
    errors.content = CONTENT_REQUIRED_MESSAGE
  }

  if (Object.keys(errors).length > 0 || !amount.ok) return { ok: false, errors }
  return { ok: true, values: { amount: amount.value, dueDate: input.dueDate, barcode } }
}
