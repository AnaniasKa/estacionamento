import { useState } from 'react'
import { billStatus, type Bill } from '../../lib/bills'
import { monthYearLabel } from '../../lib/format'
import { updateBillPayer } from '../../lib/queries'
import type { RotationSettings } from '../../lib/rotation'
import { payerChange, swappableBills } from '../../lib/settingsRules'
import type { Person } from '../../lib/types'
import StatusLine from './StatusLine'
import { useSaveState } from './useSaveState'

interface CommonProps {
  people: Person[]
  ids: readonly [string, string]
  settings: RotationSettings
  today: string
  onSaved: (billId: string, payerId: string, payerOverride: boolean) => void
}

/** Troca de vez de meses que já têm boleto pendente ou vencido. Boleto pago não aparece. */
export default function SwapBlock({ bills, ...common }: CommonProps & { bills: Bill[] }) {
  const eligible = swappableBills(bills)
  return (
    <section className="stack" aria-label="Troca de vez">
      <h2 className="section-title">Troca de vez</h2>
      {eligible.length === 0 ? (
        <div className="card stack">
          <p className="muted">
            A troca vale para meses que já têm boleto pendente. Para um mês sem boleto, escolha quem paga no
            campo "Quem paga" ao lançar o boleto.
          </p>
        </div>
      ) : (
        <ul className="history-list">
          {eligible.map((bill) => (
            <SwapItem key={bill.id} bill={bill} {...common} />
          ))}
        </ul>
      )}
    </section>
  )
}

function SwapItem({ bill, people, ids, settings, today, onSaved }: CommonProps & { bill: Bill }) {
  const [chosen, setChosen] = useState(bill.payer_id)
  const save = useSaveState()
  const label = monthYearLabel(bill.month)
  const overdue = billStatus(bill, today) === 'overdue'

  async function onSave() {
    if (save.saving || chosen === bill.payer_id) return
    const change = payerChange(bill.month, chosen, settings, ids)
    save.start()
    try {
      await updateBillPayer(bill.id, change.payerId, change.payerOverride)
      onSaved(bill.id, change.payerId, change.payerOverride)
      save.succeed()
    } catch {
      save.fail('Não foi possível trocar o pagador. Verifique a conexão e tente de novo.')
    }
  }

  return (
    <li className="card stack">
      <div className="history-row">
        <span className="history-month">{label}</span>
        <span className={`pill status-${overdue ? 'overdue' : 'pending'}`}>{overdue ? 'Vencido' : 'Pendente'}</span>
      </div>
      <label className="field">
        <span>Quem paga</span>
        <select value={chosen} onChange={(e) => setChosen(e.target.value)} aria-label={`Quem paga em ${label}`}>
          {people.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      <StatusLine status={save.status} message={save.message} />
      <button type="button" onClick={onSave} disabled={save.saving || chosen === bill.payer_id}>
        {save.saving ? 'Salvando…' : 'Trocar pagador'}
      </button>
    </li>
  )
}
