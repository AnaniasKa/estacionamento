import { useState } from 'react'
import { Link } from 'react-router-dom'
import BarcodeBlock from '../components/BarcodeBlock'
import { AlertIcon, CheckIcon, ClockIcon, LogoutIcon } from '../components/icons'
import ShareBlock from '../components/ShareBlock'
import { ErrorCard, LoadingCard } from '../components/States'
import { useAsyncData } from '../hooks/useAsyncData'
import { useSession } from '../hooks/useSession'
import { useToday } from '../hooks/useToday'
import { signOut } from '../lib/auth'
import { billStatus, previousMonthLine, statusText, type Bill } from '../lib/bills'
import { formatBRL, formatDayMonth, monthYearLabel } from '../lib/format'
import { loadHome, markBillPaid, type HomeData } from '../lib/queries'
import { getRotation, monthStart, previousMonth, resolvePayer } from '../lib/rotation'
import type { Member, Person } from '../lib/types'

export default function Home() {
  const { member } = useSession()
  const today = useToday() // muda só quando o dia muda (também ao voltar o foco da aba)
  const month = monthStart(today)
  const previous = previousMonth(month)
  // Só o boleto do mês atual e o do mês anterior. Refaz a consulta apenas se o dia mudou.
  const { state, reload, update } = useAsyncData(() => loadHome([month, previous]), [today])

  function onPaid(billId: string, paidAt: string, memberId: string) {
    update((d) => ({
      ...d,
      bills: d.bills.map((b) =>
        b.id === billId ? { ...b, status: 'paid' as const, paid_at: paidAt, paid_by: memberId } : b,
      ),
    }))
  }

  function onShared(billId: string, openedAt: string) {
    update((d) => ({
      ...d,
      bills: d.bills.map((b) => (b.id === billId ? { ...b, whatsapp_opened_at: openedAt } : b)),
    }))
  }

  return (
    <main className="page">
      <header className="header">
        <h1 className="page-title">Estacionamento</h1>
        <button type="button" className="icon-btn" aria-label="Sair" onClick={() => void signOut()}>
          <LogoutIcon />
        </button>
      </header>

      {state.status === 'loading' && <LoadingCard />}
      {state.status === 'error' && <ErrorCard onRetry={reload} />}
      {state.status === 'ready' && member && (
        <HomeContent
          data={state.data}
          me={member}
          today={today}
          month={month}
          previous={previous}
          onPaid={onPaid}
          onShared={onShared}
        />
      )}
    </main>
  )
}

interface ContentProps {
  data: HomeData
  me: Member
  today: string
  month: string
  previous: string
  onPaid: (billId: string, paidAt: string, memberId: string) => void
  onShared: (billId: string, openedAt: string) => void
}

function HomeContent({ data, me, today, month, previous, onPaid, onShared }: ContentProps) {
  // Sem settings ou sem a segunda pessoa, não há rodízio: nada de rotation.ts.
  const rotation = getRotation(data.people, data.settings)
  if (!rotation) {
    const missingPerson = data.people.length < 2
    return (
      <div className="card stack">
        <h2 className="section-title">Rodízio ainda não configurado</h2>
        <p className="muted">
          {missingPerson
            ? 'Falta cadastrar a outra pessoa. Quando ela estiver cadastrada, a vez de cada mês aparece aqui.'
            : 'Faltam o mês e o pagador iniciais. Quando forem definidos, a vez de cada mês aparece aqui.'}
        </p>
      </div>
    )
  }

  const nameOf = (id: string) => data.people.find((p) => p.id === id)?.name ?? 'Outra pessoa'
  const bill = data.bills.find((b) => b.month === month) ?? null
  const previousBill = data.bills.find((b) => b.month === previous) ?? null

  // Pagador congelado: com boleto, vale bills.payer_id; o rodízio só vale para mês sem boleto.
  const payerId = resolvePayer(month, rotation.settings, rotation.ids, bill ? { payerId: bill.payer_id } : null)
  const isMe = payerId === me.id
  const context = previousMonthLine(previousBill, today, me.id, nameOf)

  return (
    <>
      <section className="highlight">
        <p className="highlight-month">{monthYearLabel(month)}</p>
        <p className="highlight-title">{isMe ? 'Sua vez' : `Vez de ${nameOf(payerId)}`}</p>
        {context && <p className="highlight-context">{context}</p>}
      </section>

      {bill ? (
        <BillDetails
          bill={bill}
          today={today}
          memberId={me.id}
          recipient={data.people.find((p) => p.id === bill.payer_id)}
          onPaid={onPaid}
          onShared={onShared}
        />
      ) : (
        <div className="card stack">
          <h2 className="section-title">Nenhum boleto lançado</h2>
          <p className="muted">Quando o boleto do mês for lançado, ele aparece aqui.</p>
          <Link to="/boleto" className="btn btn-primary">
            Lançar boleto
          </Link>
        </div>
      )}
    </>
  )
}

function BillDetails({
  bill,
  today,
  memberId,
  recipient,
  onPaid,
  onShared,
}: {
  bill: Bill
  today: string
  memberId: string
  recipient: Person | undefined
  onPaid: (billId: string, paidAt: string, memberId: string) => void
  onShared: (billId: string, openedAt: string) => void
}) {
  const status = billStatus(bill, today)
  const StatusIcon = status === 'paid' ? CheckIcon : status === 'overdue' ? AlertIcon : ClockIcon

  return (
    <>
      <div className="grid2">
        <div className="mini">
          <p className="mini-label">Valor</p>
          <p className="mini-value">{formatBRL(bill.amount)}</p>
        </div>
        <div className="mini">
          <p className="mini-label">Vence em</p>
          <p className="mini-value">{formatDayMonth(bill.due_date)}</p>
        </div>
      </div>

      {(bill.barcode || bill.attachment_path) && (
        <BarcodeBlock barcode={bill.barcode} attachmentPath={bill.attachment_path} />
      )}

      <div className={`status status-${status}`}>
        <StatusIcon width={18} height={18} />
        <span>{statusText(bill, today)}</span>
      </div>

      {/* Compartilhar no WhatsApp: só aparece para quem não é o pagador do boleto. */}
      <div className="share-slot">
        <ShareBlock bill={bill} recipient={recipient} onShared={onShared} />
      </div>

      {status !== 'paid' && <MarkPaid bill={bill} memberId={memberId} onPaid={onPaid} />}
      <Link to={`/boleto?mes=${bill.month}`} className="btn">
        Editar boleto
      </Link>
    </>
  )
}

function MarkPaid({
  bill,
  memberId,
  onPaid,
}: {
  bill: Bill
  memberId: string
  onPaid: (billId: string, paidAt: string, memberId: string) => void
}) {
  const [step, setStep] = useState<'idle' | 'confirm' | 'saving'>('idle')
  const [error, setError] = useState<string | null>(null)

  async function confirm() {
    setStep('saving')
    setError(null)
    try {
      const paidAt = await markBillPaid(bill.id, memberId)
      onPaid(bill.id, paidAt, memberId) // troca o botão por "Pago em <data>"
    } catch {
      setError('Não foi possível marcar como pago. Tente de novo.')
      setStep('confirm')
    }
  }

  if (step === 'idle') {
    return (
      <button type="button" onClick={() => setStep('confirm')}>
        Marcar como pago
      </button>
    )
  }

  return (
    <div className="card stack">
      <p>Marcar este boleto como pago?</p>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="row">
        <button type="button" onClick={() => setStep('idle')} disabled={step === 'saving'}>
          Cancelar
        </button>
        <button type="button" className="btn-primary" onClick={confirm} disabled={step === 'saving'}>
          {step === 'saving' ? 'Salvando…' : 'Sim, marcar como pago'}
        </button>
      </div>
    </div>
  )
}
