import { Link } from 'react-router-dom'
import PdfButton from '../components/PdfButton'
import { ErrorCard, LoadingCard } from '../components/States'
import { useAsyncData } from '../hooks/useAsyncData'
import { useToday } from '../hooks/useToday'
import { billStatus, type Bill } from '../lib/bills'
import { formatBRL, monthYearLabel } from '../lib/format'
import { historyStatusLabel, payerLine, sortBillsDesc } from '../lib/history'
import { loadHistory } from '../lib/queries'

export default function History() {
  const today = useToday() // recalculado ao voltar o foco; só refaz a consulta se o dia mudou
  const { state, reload } = useAsyncData(loadHistory, [today])

  return (
    <main className="page">
      <header className="header">
        <h1 className="page-title">Histórico</h1>
      </header>

      {state.status === 'loading' && <LoadingCard />}
      {state.status === 'error' && <ErrorCard onRetry={reload} />}
      {state.status === 'ready' &&
        (state.data.bills.length === 0 ? (
          <div className="card stack">
            <h2 className="section-title">Nenhum boleto por aqui ainda</h2>
            <p className="muted">Assim que o primeiro boleto for lançado, ele aparece nesta lista.</p>
            <Link to="/boleto" className="btn btn-primary">
              Lançar boleto
            </Link>
          </div>
        ) : (
          <ul className="history-list">
            {sortBillsDesc(state.data.bills).map((bill) => (
              <HistoryItem
                key={bill.id}
                bill={bill}
                today={today}
                payerName={state.data.people.find((p) => p.id === bill.payer_id)?.name ?? 'Outra pessoa'}
              />
            ))}
          </ul>
        ))}
    </main>
  )
}

function HistoryItem({ bill, today, payerName }: { bill: Bill; today: string; payerName: string }) {
  const status = billStatus(bill, today)
  const label = monthYearLabel(bill.month)
  return (
    <li className="card stack-sm">
      <Link to={`/boleto?mes=${bill.month}`} className="history-link">
        <div className="history-row">
          <span className="history-month">{label}</span>
          <span className="history-amount">{formatBRL(bill.amount)}</span>
        </div>
        <div className="history-row">
          <span className="muted">{payerLine(bill, payerName)}</span>
          <span className={`pill status-${status}`}>{historyStatusLabel(bill, today)}</span>
        </div>
      </Link>
      {bill.attachment_path && <PdfButton path={bill.attachment_path} />}
    </li>
  )
}
