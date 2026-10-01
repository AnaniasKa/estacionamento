// Acesso a dados. Erros viram exceções genéricas: a tela mostra uma frase própria e nunca
// a mensagem crua do Supabase. Nada aqui registra dados no console.
import { BILL_COLUMNS, type Bill } from './bills'
import type { RotationSettings } from './rotation'
import { removeBillPdf, uploadBillPdf } from './pdf'
import { supabase } from './supabase'
import type { Person } from './types'

export interface HomeData {
  people: Person[]
  settings: RotationSettings | null
  bills: Bill[]
}

/** Membros, configuração do rodízio e só os boletos dos meses pedidos. */
export async function loadHome(months: string[]): Promise<HomeData> {
  const [people, settings, bills] = await Promise.all([
    supabase.from('members').select('id, name, phone'),
    supabase.from('settings').select('first_month, first_payer_id').maybeSingle(),
    supabase.from('bills').select(BILL_COLUMNS).in('month', months),
  ])
  if (people.error || settings.error || bills.error) throw new Error('load-failed')
  return {
    people: (people.data ?? []) as Person[],
    settings: settings.data
      ? { firstMonth: settings.data.first_month, firstPayerId: settings.data.first_payer_id }
      : null,
    bills: (bills.data ?? []).map(toBill),
  }
}

// numeric do Postgres chega como string ou número; a tela trabalha com número.
function toBill(row: unknown): Bill {
  const r = row as Bill
  return { ...r, amount: Number(r.amount) }
}

export interface HistoryData {
  people: Person[]
  bills: Bill[]
}

/** Membros (para os nomes) e todos os boletos. */
export async function loadHistory(): Promise<HistoryData> {
  const [people, bills] = await Promise.all([
    supabase.from('members').select('id, name, phone'),
    supabase.from('bills').select(BILL_COLUMNS),
  ])
  if (people.error || bills.error) throw new Error('load-failed')
  return { people: (people.data ?? []) as Person[], bills: (bills.data ?? []).map(toBill) }
}

export interface SettingsData {
  people: Person[]
  settings: RotationSettings | null
  bills: Bill[]
}

/** Tudo que os Ajustes mostram: membros, rodízio e boletos (para a troca de vez e o aviso). */
export async function loadSettingsData(): Promise<SettingsData> {
  const [people, settings, bills] = await Promise.all([
    supabase.from('members').select('id, name, phone'),
    supabase.from('settings').select('first_month, first_payer_id').maybeSingle(),
    supabase.from('bills').select(BILL_COLUMNS),
  ])
  if (people.error || settings.error || bills.error) throw new Error('load-failed')
  return {
    people: (people.data ?? []) as Person[],
    settings: settings.data
      ? { firstMonth: settings.data.first_month, firstPayerId: settings.data.first_payer_id }
      : null,
    bills: (bills.data ?? []).map(toBill),
  }
}

/** Grava só name e phone (únicas colunas liberadas). Zero linhas = bloqueado pela policy. */
export async function updateMember(id: string, name: string, phone: string | null): Promise<void> {
  const { data, error } = await supabase.from('members').update({ name, phone }).eq('id', id).select('id')
  if (error || !data || data.length === 0) throw new Error('update-member-failed')
}

/** Grava o rodízio (settings tem uma linha só, id = true). Não toca em bills. */
export async function updateRotation(firstMonth: string, firstPayerId: string): Promise<void> {
  const { data, error } = await supabase
    .from('settings')
    .update({ first_month: firstMonth, first_payer_id: firstPayerId })
    .eq('id', true)
    .select('id')
  if (error || !data || data.length === 0) throw new Error('update-rotation-failed')
}

/** Troca o pagador de um boleto (uma linha). */
export async function updateBillPayer(billId: string, payerId: string, payerOverride: boolean): Promise<void> {
  const { data, error } = await supabase
    .from('bills')
    .update({ payer_id: payerId, payer_override: payerOverride })
    .eq('id', billId)
    .select('id')
  if (error || !data || data.length === 0) throw new Error('update-payer-failed')
}

export type SaveBillErrorCode = 'duplicate' | 'upload' | 'failed'

export class SaveBillError extends Error {
  constructor(public code: SaveBillErrorCode) {
    super(code)
  }
}

export interface BillInput {
  month: string // 'YYYY-MM-01'
  payerId: string
  payerOverride: boolean
  amount: number
  dueDate: string
  barcode: string | null
}

/**
 * Lança um boleto. O PDF (se houver) sobe primeiro, para <bill_id>/…; se o insert falhar,
 * o PDF enviado é removido, sem deixar arquivo órfão no Storage.
 */
export async function createBill(input: BillInput, file: File | null): Promise<Bill> {
  const id = crypto.randomUUID()
  let path: string | null = null
  if (file) {
    try {
      path = await uploadBillPdf(id, file)
    } catch {
      throw new SaveBillError('upload')
    }
  }

  const { data, error } = await supabase
    .from('bills')
    .insert({
      id,
      month: input.month,
      payer_id: input.payerId,
      payer_override: input.payerOverride,
      amount: input.amount,
      due_date: input.dueDate,
      barcode: input.barcode,
      attachment_path: path,
    })
    .select(BILL_COLUMNS)
    .single()

  if (error || !data) {
    if (path) await removeBillPdf(path)
    throw new SaveBillError(error?.code === '23505' ? 'duplicate' : 'failed')
  }
  return toBill(data)
}

/**
 * Edita um boleto. O mês não entra no update (e o banco nem concede a coluna). Com PDF novo,
 * ele sobe antes do update; se o update falhar, o novo é removido e o antigo continua valendo.
 * O PDF antigo só é removido depois de o update dar certo.
 */
export async function updateBill(current: Bill, input: BillInput, file: File | null): Promise<Bill> {
  let newPath: string | null = null
  if (file) {
    try {
      newPath = await uploadBillPdf(current.id, file)
    } catch {
      throw new SaveBillError('upload')
    }
  }

  const { data, error } = await supabase
    .from('bills')
    .update({
      payer_id: input.payerId,
      payer_override: input.payerOverride,
      amount: input.amount,
      due_date: input.dueDate,
      barcode: input.barcode,
      attachment_path: newPath ?? current.attachment_path,
    })
    .eq('id', current.id)
    .select(BILL_COLUMNS)

  // RLS não devolve erro ao negar um update: zero linhas também é falha.
  if (error || !data || data.length === 0) {
    if (newPath) await removeBillPdf(newPath)
    throw new SaveBillError('failed')
  }
  if (newPath && current.attachment_path) await removeBillPdf(current.attachment_path)
  return toBill(data[0])
}

/** Marca como pago gravando status, paid_at e paid_by juntos (a constraint exige). */
export async function markBillPaid(billId: string, memberId: string): Promise<string> {
  const paidAt = new Date().toISOString()
  const { data, error } = await supabase
    .from('bills')
    .update({ status: 'paid', paid_at: paidAt, paid_by: memberId })
    .eq('id', billId)
    .select('id')
  if (error || !data || data.length === 0) throw new Error('mark-paid-failed')
  return paidAt
}
