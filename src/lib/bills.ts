// Regras puras sobre boletos: status, textos de status e contexto do mês anterior.
import { daysBetween, localDateOfTimestamp } from './dates'
import { capitalize, formatDayMonth, monthName } from './format'

/** Linha de public.bills (nomes das colunas do banco). */
export interface Bill {
  id: string
  month: string
  payer_id: string
  payer_override: boolean
  amount: number
  due_date: string
  barcode: string | null
  attachment_path: string | null
  status: 'pending' | 'paid'
  paid_at: string | null
  paid_by: string | null
  whatsapp_opened_at: string | null
  created_by: string
  created_at: string
}

export const BILL_COLUMNS =
  'id, month, payer_id, payer_override, amount, due_date, barcode, attachment_path, status, paid_at, paid_by, whatsapp_opened_at, created_by, created_at'

export type BillStatus = 'paid' | 'overdue' | 'pending'

/** paid se status = 'paid'; overdue se pendente e vencimento anterior a hoje; senão pending. */
export function billStatus(bill: Pick<Bill, 'status' | 'due_date'>, today: string): BillStatus {
  if (bill.status === 'paid') return 'paid'
  return bill.due_date < today ? 'overdue' : 'pending'
}

/** Texto curto do status, para o indicador da tela. */
export function statusText(bill: Pick<Bill, 'status' | 'due_date' | 'paid_at'>, today: string): string {
  const status = billStatus(bill, today)
  if (status === 'paid') {
    return bill.paid_at ? `Pago em ${formatDayMonth(localDateOfTimestamp(bill.paid_at))}` : 'Pago'
  }
  if (status === 'overdue') {
    const n = daysBetween(bill.due_date, today)
    return n === 1 ? 'Vencido há 1 dia' : `Vencido há ${n} dias`
  }
  const d = daysBetween(today, bill.due_date)
  if (d === 0) return 'Pendente · vence hoje'
  if (d === 1) return 'Pendente · vence amanhã'
  return `Pendente · vence em ${d} dias`
}

/**
 * Linha sobre o mês anterior:
 *  - pago: "<Nome> pagou <mês>" (ou "Você pagou <mês>");
 *  - pendente ou vencido: "<Mês> ainda está pendente";
 *  - sem boleto: null (a tela não mostra a linha).
 */
export function previousMonthLine(
  previous: Bill | null | undefined,
  today: string,
  meId: string,
  nameOf: (memberId: string) => string,
): string | null {
  if (!previous) return null
  const label = monthName(previous.month)
  if (billStatus(previous, today) === 'paid') {
    const who = previous.paid_by ?? previous.payer_id
    return who === meId ? `Você pagou ${label}` : `${nameOf(who)} pagou ${label}`
  }
  return `${capitalize(label)} ainda está pendente`
}
