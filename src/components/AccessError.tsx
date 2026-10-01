import { signOut } from '../lib/auth'
import { useSession } from '../hooks/useSession'

/** Não foi possível confirmar o acesso (ex.: sem rede). Não desloga sozinho. */
export default function AccessError() {
  const { retryMember } = useSession()
  return (
    <main className="page">
      <h1 className="page-title">Estacionamento</h1>
      <div className="card stack">
        <p>Não foi possível confirmar seu acesso. Verifique a conexão e tente de novo.</p>
        <button type="button" className="btn-primary" onClick={retryMember}>
          Tentar de novo
        </button>
        <button type="button" onClick={() => void signOut()}>
          Sair
        </button>
      </div>
    </main>
  )
}
