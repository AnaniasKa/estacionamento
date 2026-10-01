import { Link } from 'react-router-dom'
import { ErrorCard, LoadingCard } from '../components/States'
import { useAsyncData } from '../hooks/useAsyncData'
import { useSession } from '../hooks/useSession'
import { useToday } from '../hooks/useToday'
import { signOut } from '../lib/auth'
import { loadSettingsData, type SettingsData } from '../lib/queries'
import { getRotation, type RotationSettings } from '../lib/rotation'
import AccountBlock from './settings/AccountBlock'
import PasswordBlock from './settings/PasswordBlock'
import RotationBlock from './settings/RotationBlock'
import SwapBlock from './settings/SwapBlock'

/**
 * Ajustes. Cada bloco guarda o que o usuário digita; salvar um bloco só atualiza os dados
 * compartilhados (via update), sem recarregar a tela nem apagar a edição dos outros.
 * Início e Histórico consultam o banco ao abrir, então já mostram o rodízio novo ao navegar.
 */
export default function Settings() {
  const { member } = useSession()
  const today = useToday()
  const { state, reload, update } = useAsyncData(loadSettingsData, [])

  return (
    <main className="page">
      <header className="header">
        <h1 className="page-title">Ajustes</h1>
        <nav className="header-actions">
          <Link to="/">Voltar</Link>
        </nav>
      </header>

      {state.status === 'loading' && <LoadingCard />}
      {state.status === 'error' && <ErrorCard onRetry={reload} />}
      {state.status === 'ready' && member && (
        <>
          <AccountBlock
            people={state.data.people}
            meId={member.id}
            onSaved={(id, name, phone) =>
              update((d) => ({ ...d, people: d.people.map((p) => (p.id === id ? { ...p, name, phone } : p)) }))
            }
          />

          <RotationAndSwap
            data={state.data}
            today={today}
            onRotation={(settings) => update((d) => ({ ...d, settings }))}
            onPayer={(billId, payerId, payerOverride) =>
              update((d) => ({
                ...d,
                bills: d.bills.map((b) =>
                  b.id === billId ? { ...b, payer_id: payerId, payer_override: payerOverride } : b,
                ),
              }))
            }
          />
        </>
      )}

      <PasswordBlock />

      <button type="button" onClick={() => void signOut()}>
        Sair
      </button>
    </main>
  )
}

function RotationAndSwap({
  data,
  today,
  onRotation,
  onPayer,
}: {
  data: SettingsData
  today: string
  onRotation: (settings: RotationSettings) => void
  onPayer: (billId: string, payerId: string, payerOverride: boolean) => void
}) {
  // Sem settings ou sem as duas pessoas, os blocos de rodízio e troca não aparecem.
  const rotation = getRotation(data.people, data.settings)
  if (!rotation) return null
  return (
    <>
      <RotationBlock
        people={data.people}
        settings={rotation.settings}
        hasBills={data.bills.length > 0}
        onSaved={onRotation}
      />
      <SwapBlock
        people={data.people}
        ids={rotation.ids}
        settings={rotation.settings}
        bills={data.bills}
        today={today}
        onSaved={onPayer}
      />
    </>
  )
}
