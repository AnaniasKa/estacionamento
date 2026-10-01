import { describe, expect, it } from 'vitest'
import { historyStatusLabel, payerLine, sortBillsDesc } from '../lib/history'

describe('sortBillsDesc', () => {
  it('ordena do mês mais recente para o mais antigo, atravessando anos', () => {
    const bills = [{ month: '2026-02-01' }, { month: '2026-10-01' }, { month: '2025-12-01' }, { month: '2026-09-01' }]
    expect(sortBillsDesc(bills).map((b) => b.month)).toEqual([
      '2026-10-01',
      '2026-09-01',
      '2026-02-01',
      '2025-12-01',
    ])
  })

  it('não altera a lista original', () => {
    const bills = [{ month: '2026-01-01' }, { month: '2026-02-01' }]
    sortBillsDesc(bills)
    expect(bills[0].month).toBe('2026-01-01')
  })

  it('lista vazia', () => {
    expect(sortBillsDesc([])).toEqual([])
  })
})

describe('historyStatusLabel', () => {
  const today = '2026-10-15'

  it('pendente quando vence hoje ou depois', () => {
    expect(historyStatusLabel({ status: 'pending', due_date: '2026-10-15', paid_at: null }, today)).toBe('Pendente')
    expect(historyStatusLabel({ status: 'pending', due_date: '2026-10-20', paid_at: null }, today)).toBe('Pendente')
  })

  it('vencido quando pendente e o vencimento já passou', () => {
    expect(historyStatusLabel({ status: 'pending', due_date: '2026-10-14', paid_at: null }, today)).toBe('Vencido')
  })

  it('pago com a data local do pagamento, mesmo se estaria vencido', () => {
    const paidAt = new Date(2026, 9, 12, 12, 0, 0).toISOString()
    expect(historyStatusLabel({ status: 'paid', due_date: '2026-10-01', paid_at: paidAt }, today)).toBe(
      'Pago em 12/10',
    )
  })

  it('pago sem data devolve só "Pago"', () => {
    expect(historyStatusLabel({ status: 'paid', due_date: '2026-10-01', paid_at: null }, today)).toBe('Pago')
  })
})

describe('payerLine', () => {
  it('usa o pagador do boleto: "Pagou" se pago, "Paga" se não', () => {
    expect(payerLine({ status: 'paid' }, 'Ana')).toBe('Pagou: Ana')
    expect(payerLine({ status: 'pending' }, 'Ana')).toBe('Paga: Ana')
  })
})
