import { useState, type FormEvent } from 'react'
import { updateRotation } from '../../lib/queries'
import type { RotationSettings } from '../../lib/rotation'
import { normalizeFirstMonth } from '../../lib/settingsRules'
import type { Person } from '../../lib/types'
import StatusLine from './StatusLine'
import { useSaveState } from './useSaveState'

/** Rodízio: mês inicial e pagador inicial. Salvar aqui nunca mexe em bills. */
export default function RotationBlock({
  people,
  settings,
  hasBills,
  onSaved,
}: {
  people: Person[]
  settings: RotationSettings
  hasBills: boolean
  onSaved: (settings: RotationSettings) => void
}) {
  const [month, setMonth] = useState(settings.firstMonth.slice(0, 7)) // YYYY-MM
  const [payerId, setPayerId] = useState(settings.firstPayerId)
  const [monthError, setMonthError] = useState<string | null>(null)
  const save = useSaveState()

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (save.saving) return
    const firstMonth = normalizeFirstMonth(month)
    setMonthError(firstMonth ? null : 'Escolha o mês inicial.')
    if (!firstMonth) return

    save.start()
    try {
      await updateRotation(firstMonth, payerId)
      onSaved({ firstMonth, firstPayerId: payerId })
      save.succeed()
    } catch {
      save.fail('Não foi possível salvar o rodízio. Verifique a conexão e tente de novo.')
    }
  }

  return (
    <form className="card stack" onSubmit={onSubmit} noValidate aria-label="Rodízio">
      <h2 className="section-title">Rodízio</h2>
      <label className="field">
        <span>Mês inicial</span>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          aria-invalid={monthError ? true : undefined}
        />
        {monthError && <small className="field-error">{monthError}</small>}
      </label>
      <label className="field">
        <span>Quem paga no mês inicial</span>
        <select value={payerId} onChange={(e) => setPayerId(e.target.value)}>
          {people.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      {hasBills && (
        <p className="muted">Só os meses sem boleto mudam. Os boletos já lançados mantêm o pagador.</p>
      )}
      <StatusLine status={save.status} message={save.message} />
      <button type="submit" className="btn-primary" disabled={save.saving}>
        {save.saving ? 'Salvando…' : 'Salvar rodízio'}
      </button>
    </form>
  )
}
