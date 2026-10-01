import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import BarcodeBlock from '../components/BarcodeBlock'
import { ErrorCard, LoadingCard } from '../components/States'
import { useAsyncData } from '../hooks/useAsyncData'
import { useToday } from '../hooks/useToday'
import { formatBarcode } from '../lib/barcode'
import { amountToInput, pdfFileError, validateBillForm, type BillFormErrors } from '../lib/billForm'
import type { Bill } from '../lib/bills'
import { formatBRL, formatDate, monthYearLabel } from '../lib/format'
import { createBill, loadHome, SaveBillError, updateBill, type HomeData } from '../lib/queries'
import { getRotation, isPayerOverride, monthStart, rotationPayer } from '../lib/rotation'

const MONTH_PARAM = /^\d{4}-(0[1-9]|1[0-2])-01$/

/** Lançar (mês sem boleto) ou editar (mês com boleto). O mês vem de ?mes=YYYY-MM-01; padrão: mês atual. */
export default function BillForm() {
  const today = useToday()
  const [params] = useSearchParams()
  const requested = params.get('mes')
  const month = requested && MONTH_PARAM.test(requested) ? requested : monthStart(today)
  const { state, reload } = useAsyncData(() => loadHome([month]), [month])

  return (
    <main className="page">
      <header className="header">
        <h1 className="page-title">{state.status === 'ready' && state.data.bills.length > 0 ? 'Editar boleto' : 'Lançar boleto'}</h1>
        <nav className="header-actions">
          <Link to="/">Voltar</Link>
        </nav>
      </header>

      {state.status === 'loading' && <LoadingCard />}
      {state.status === 'error' && <ErrorCard onRetry={reload} />}
      {state.status === 'ready' && <FormOrNotice key={month} data={state.data} month={month} />}
    </main>
  )
}

function FormOrNotice({ data, month }: { data: HomeData; month: string }) {
  const rotation = getRotation(data.people, data.settings)
  if (!rotation) {
    return (
      <div className="card stack">
        <h2 className="section-title">Rodízio ainda não configurado</h2>
        <p className="muted">Para lançar um boleto é preciso ter as duas pessoas e o rodízio definidos.</p>
      </div>
    )
  }
  const bill = data.bills.find((b) => b.month === month) ?? null
  return <Form data={data} ids={rotation.ids} settings={rotation.settings} month={month} bill={bill} />
}

function Form({
  data,
  ids,
  settings,
  month,
  bill,
}: {
  data: HomeData
  ids: readonly [string, string]
  settings: { firstMonth: string; firstPayerId: string }
  month: string
  bill: Bill | null
}) {
  const editing = bill !== null
  const [monthValue, setMonthValue] = useState(month.slice(0, 7)) // YYYY-MM
  const [payerId, setPayerId] = useState(bill?.payer_id ?? rotationPayer(month, settings, ids))
  const [payerTouched, setPayerTouched] = useState(editing)
  const [amount, setAmount] = useState(bill ? amountToInput(bill.amount) : '')
  const [dueDate, setDueDate] = useState(bill?.due_date ?? '')
  const [barcode, setBarcode] = useState(bill?.barcode ? formatBarcode(bill.barcode) : '')
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [errors, setErrors] = useState<BillFormErrors>({})
  const [saving, setSaving] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)
  const [saved, setSaved] = useState<Bill | null>(null)

  const nameOf = (id: string) => data.people.find((p) => p.id === id)?.name ?? 'Outra pessoa'

  function onMonthChange(value: string) {
    setMonthValue(value)
    // Enquanto a pessoa não escolheu o pagador, ele acompanha o rodízio do mês escolhido.
    if (!payerTouched && /^\d{4}-(0[1-9]|1[0-2])$/.test(value)) {
      setPayerId(rotationPayer(`${value}-01`, settings, ids))
    }
  }

  function onFileChange(chosen: File | null) {
    const error = chosen ? pdfFileError(chosen) : null
    setFileError(error)
    setFile(error ? null : chosen)
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (saving) return
    setFailure(null)

    const hasPdf = file !== null || bill?.attachment_path != null
    const result = validateBillForm({ month: monthValue, payerId, amount, dueDate, barcode }, ids, hasPdf)
    setErrors(result.ok ? {} : result.errors)
    if (!result.ok || fileError) return

    const billMonth = bill ? bill.month : `${monthValue}-01`
    const input = {
      month: billMonth,
      payerId,
      payerOverride: isPayerOverride(billMonth, payerId, settings, ids),
      amount: result.values.amount,
      dueDate: result.values.dueDate,
      barcode: result.values.barcode,
    }

    setSaving(true)
    try {
      setSaved(bill ? await updateBill(bill, input, file) : await createBill(input, file))
    } catch (err) {
      setFailure(saveErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  if (saved) {
    return <Confirmation bill={saved} payerName={nameOf(saved.payer_id)} editing={editing} />
  }

  return (
    <form className="card stack" onSubmit={onSubmit} noValidate>
      <label className="field">
        <span>Mês</span>
        <input
          type="month"
          name="month"
          value={monthValue}
          disabled={editing}
          onChange={(e) => onMonthChange(e.target.value)}
          aria-invalid={errors.month ? true : undefined}
        />
        {editing && <small className="muted">O mês de um boleto não pode ser alterado.</small>}
        {errors.month && <small className="field-error">{errors.month}</small>}
      </label>

      <label className="field">
        <span>Quem paga</span>
        <select
          name="payer"
          value={payerId}
          onChange={(e) => {
            setPayerId(e.target.value)
            setPayerTouched(true)
          }}
        >
          {ids.map((id) => (
            <option key={id} value={id}>
              {nameOf(id)}
            </option>
          ))}
        </select>
        {errors.payerId && <small className="field-error">{errors.payerId}</small>}
      </label>

      <label className="field">
        <span>Valor (R$)</span>
        <input
          type="text"
          name="amount"
          inputMode="decimal"
          autoComplete="off"
          placeholder="0,00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          aria-invalid={errors.amount ? true : undefined}
        />
        {errors.amount && <small className="field-error">{errors.amount}</small>}
      </label>

      <label className="field">
        <span>Vencimento</span>
        <input
          type="date"
          name="due-date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          aria-invalid={errors.dueDate ? true : undefined}
        />
        {errors.dueDate && <small className="field-error">{errors.dueDate}</small>}
      </label>

      <label className="field">
        <span>Linha digitável (ou anexe o PDF)</span>
        <input
          type="text"
          name="barcode"
          inputMode="numeric"
          autoComplete="off"
          className="mono"
          value={barcode}
          onChange={(e) => setBarcode(e.target.value)}
          aria-invalid={errors.barcode ? true : undefined}
        />
        {errors.barcode && <small className="field-error">{errors.barcode}</small>}
      </label>

      <label className="field">
        <span>PDF do boleto (até 5 MB; obrigatório se não houver linha digitável)</span>
        <input
          type="file"
          name="pdf"
          accept="application/pdf"
          onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
        />
        {bill?.attachment_path && !file && (
          <small className="muted">Já há um PDF anexado. Escolha outro só se quiser substituí-lo.</small>
        )}
        {fileError && <small className="field-error">{fileError}</small>}
      </label>

      {errors.content && (
        <p className="error" role="alert">
          {errors.content}
        </p>
      )}

      {failure && (
        <p className="error" role="alert">
          {failure}
        </p>
      )}

      <button type="submit" className="btn-primary" disabled={saving}>
        {saving ? 'Salvando…' : editing ? 'Salvar alterações' : 'Lançar boleto'}
      </button>
    </form>
  )
}

function saveErrorMessage(err: unknown): string {
  if (err instanceof SaveBillError) {
    if (err.code === 'duplicate') return 'Já existe um boleto para este mês. Edite-o pelo Início.'
    if (err.code === 'upload') return 'Não foi possível enviar o PDF. Tente de novo.'
  }
  return 'Não foi possível salvar o boleto. Tente de novo.'
}

/** Tela de confirmação depois de lançar ou editar. */
function Confirmation({ bill, payerName, editing }: { bill: Bill; payerName: string; editing: boolean }) {
  return (
    <>
      <section className="highlight" role="status">
        <p className="highlight-month">{monthYearLabel(bill.month)}</p>
        <p className="highlight-title">{editing ? 'Boleto atualizado' : 'Boleto lançado'}</p>
        <p className="highlight-context">Quem paga: {payerName}</p>
      </section>

      <div className="grid2">
        <div className="mini">
          <p className="mini-label">Valor</p>
          <p className="mini-value">{formatBRL(bill.amount)}</p>
        </div>
        <div className="mini">
          <p className="mini-label">Vence em</p>
          <p className="mini-value">{formatDate(bill.due_date)}</p>
        </div>
      </div>

      {(bill.barcode || bill.attachment_path) && (
        <BarcodeBlock barcode={bill.barcode} attachmentPath={bill.attachment_path} />
      )}

      {/* Passo 6: o botão "Enviar no WhatsApp" entra aqui. */}
      <div className="share-slot" />

      <Link to="/" className="btn btn-primary">
        Voltar ao início
      </Link>
    </>
  )
}
