// Regras puras da tela de Ajustes: telefone, nome, mês inicial e troca de pagador.
import type { Bill } from './bills'
import { isPayerOverride, type RotationSettings } from './rotation'

export type PhoneResult = { ok: true; phone: string | null } | { ok: false; error: string }

/**
 * Telefone: aceita máscara (parênteses, espaços, hífen, ponto e "+" no início) e grava só os
 * dígitos (10 a 15, com DDI e DDD). Vazio vira null.
 */
export function normalizePhone(input: string): PhoneResult {
  const text = input.trim()
  if (text === '') return { ok: true, phone: null }
  if (!/^\+?[\d\s().-]+$/.test(text)) {
    return { ok: false, error: 'Use apenas números. Exemplo: 5511999999999.' }
  }
  const digits = text.replace(/\D/g, '')
  if (digits.length < 10) return { ok: false, error: 'Telefone curto demais. Use DDI e DDD, como 5511999999999.' }
  if (digits.length > 15) return { ok: false, error: 'Telefone longo demais (no máximo 15 dígitos).' }
  return { ok: true, phone: digits }
}

export type NameResult = { ok: true; name: string } | { ok: false; error: string }

export function validateName(input: string): NameResult {
  const name = input.trim()
  if (name === '') return { ok: false, error: 'Informe o nome.' }
  return { ok: true, name }
}

/** Mês inicial sempre no dia 01 (o banco exige). Aceita 'YYYY-MM' ou 'YYYY-MM-DD'; senão null. */
export function normalizeFirstMonth(value: string): string | null {
  const m = /^(\d{4})-(0[1-9]|1[0-2])(?:-\d{2})?$/.exec(value.trim())
  return m ? `${m[1]}-${m[2]}-01` : null
}

/** Só boleto pendente ou vencido permite trocar o pagador; pago não. */
export function canSwapPayer(bill: Pick<Bill, 'status'>): boolean {
  return bill.status !== 'paid'
}

/** Boletos elegíveis para a troca, do mês mais recente para o mais antigo. */
export function swappableBills<T extends Pick<Bill, 'status' | 'month'>>(bills: readonly T[]): T[] {
  return bills
    .filter(canSwapPayer)
    .sort((a, b) => (a.month < b.month ? 1 : a.month > b.month ? -1 : 0))
}

/** Valores a gravar ao trocar o pagador de um mês: payer_override compara com o rodízio daquele mês. */
export function payerChange(
  month: string,
  chosenPayerId: string,
  settings: RotationSettings,
  memberIds: readonly [string, string],
): { payerId: string; payerOverride: boolean } {
  return { payerId: chosenPayerId, payerOverride: isPayerOverride(month, chosenPayerId, settings, memberIds) }
}
