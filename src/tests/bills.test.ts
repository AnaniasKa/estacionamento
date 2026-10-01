import { describe, expect, it } from 'vitest'
import { billStatus, previousMonthLine, statusText, type Bill } from '../lib/bills'

const ME = 'id-me'
const OTHER = 'id-other'
const nameOf = (id: string) => (id === OTHER ? 'Ana' : id === ME ? 'Eu' : 'Outra pessoa')

function bill(overrides: Partial<Bill> = {}): Bill {
  return {
    id: 'bill-1',
    month: '2026-09-01',
    payer_id: OTHER,
    payer_override: false,
    amount: 180,
    due_date: '2026-09-10',
    barcode: null,
    attachment_path: null,
    status: 'pending',
    paid_at: null,
    paid_by: null,
    whatsapp_opened_at: null,
    created_by: ME,
    created_at: '2026-09-01T12:00:00Z',
    ...overrides,
  }
}

describe('billStatus', () => {
  it('pago quando status = paid, mesmo com vencimento passado', () => {
    expect(billStatus({ status: 'paid', due_date: '2020-01-01' }, '2026-10-01')).toBe('paid')
  })

  it('vencido só quando pendente e vencimento anterior a hoje', () => {
    expect(billStatus({ status: 'pending', due_date: '2026-09-30' }, '2026-10-01')).toBe('overdue')
  })

  it('vence hoje ainda é pendente', () => {
    expect(billStatus({ status: 'pending', due_date: '2026-10-01' }, '2026-10-01')).toBe('pending')
    expect(billStatus({ status: 'pending', due_date: '2026-10-20' }, '2026-10-01')).toBe('pending')
  })

  it('compara na virada de ano', () => {
    expect(billStatus({ status: 'pending', due_date: '2026-12-31' }, '2027-01-01')).toBe('overdue')
  })
})

describe('statusText', () => {
  it('pendente com dias restantes', () => {
    expect(statusText(bill({ due_date: '2026-10-10' }), '2026-10-01')).toBe('Pendente · vence em 9 dias')
    expect(statusText(bill({ due_date: '2026-10-02' }), '2026-10-01')).toBe('Pendente · vence amanhã')
    expect(statusText(bill({ due_date: '2026-10-01' }), '2026-10-01')).toBe('Pendente · vence hoje')
  })

  it('vencido com dias de atraso', () => {
    expect(statusText(bill({ due_date: '2026-09-30' }), '2026-10-01')).toBe('Vencido há 1 dia')
    expect(statusText(bill({ due_date: '2026-09-25' }), '2026-10-01')).toBe('Vencido há 6 dias')
  })

  it('pago com a data local do pagamento', () => {
    const paidAt = new Date(2026, 9, 5, 14, 0).toISOString()
    expect(statusText(bill({ status: 'paid', paid_at: paidAt, paid_by: ME }), '2026-10-06')).toBe('Pago em 05/10')
  })
})

describe('previousMonthLine', () => {
  const today = '2026-10-05'

  it('sem boleto anterior, não há linha', () => {
    expect(previousMonthLine(null, today, ME, nameOf)).toBeNull()
    expect(previousMonthLine(undefined, today, ME, nameOf)).toBeNull()
  })

  it('pago por outra pessoa: "<Nome> pagou <mês>"', () => {
    const b = bill({ status: 'paid', paid_by: OTHER, paid_at: '2026-09-09T12:00:00Z' })
    expect(previousMonthLine(b, today, ME, nameOf)).toBe('Ana pagou setembro')
  })

  it('pago por mim: "Você pagou <mês>"', () => {
    const b = bill({ status: 'paid', paid_by: ME, payer_id: ME, paid_at: '2026-09-09T12:00:00Z' })
    expect(previousMonthLine(b, today, ME, nameOf)).toBe('Você pagou setembro')
  })

  it('usa quem efetivamente pagou (paid_by), não o pagador previsto', () => {
    const b = bill({ status: 'paid', payer_id: OTHER, paid_by: ME, paid_at: '2026-09-09T12:00:00Z' })
    expect(previousMonthLine(b, today, ME, nameOf)).toBe('Você pagou setembro')
  })

  it('pendente ou vencido: "<Mês> ainda está pendente"', () => {
    expect(previousMonthLine(bill({ due_date: '2026-10-20' }), today, ME, nameOf)).toBe(
      'Setembro ainda está pendente',
    )
    expect(previousMonthLine(bill({ due_date: '2026-09-10' }), today, ME, nameOf)).toBe(
      'Setembro ainda está pendente',
    )
  })
})
