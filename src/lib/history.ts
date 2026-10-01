// Regras puras do Histórico: ordem da lista e rótulo curto de status.
import { billStatus, type Bill } from './bills'
import { localDateOfTimestamp } from './dates'
import { formatDayMonth } from './format'

/** Mais recente primeiro. Meses são 'YYYY-MM-01', então a comparação de texto ordena certo. */
export function sortBillsDesc<T extends Pick<Bill, 'month'>>(bills: readonly T[]): T[] {
  return [...bills].sort((a, b) => (a.month < b.month ? 1 : a.month > b.month ? -1 : 0))
}

/** "Pago em 10/10", "Pendente" ou "Vencido". */
export function historyStatusLabel(
  bill: Pick<Bill, 'status' | 'due_date' | 'paid_at'>,
  today: string,
): string {
  const status = billStatus(bill, today)
  if (status === 'paid') {
    return bill.paid_at ? `Pago em ${formatDayMonth(localDateOfTimestamp(bill.paid_at))}` : 'Pago'
  }
  return status === 'overdue' ? 'Vencido' : 'Pendente'
}

/** "Pagou: Nome" se pago; senão "Paga: Nome". Sempre o pagador congelado (bills.payer_id). */
export function payerLine(bill: Pick<Bill, 'status'>, payerName: string): string {
  return bill.status === 'paid' ? `Pagou: ${payerName}` : `Paga: ${payerName}`
}
