export function LoadingCard() {
  return (
    <div className="card" aria-busy="true" aria-live="polite">
      <p className="muted">Carregando…</p>
    </div>
  )
}

export function ErrorCard({
  message = 'Não foi possível carregar. Verifique a conexão e tente de novo.',
  onRetry,
}: {
  message?: string
  onRetry: () => void
}) {
  return (
    <div className="card stack" role="alert">
      <p>{message}</p>
      <button type="button" onClick={onRetry}>
        Tentar de novo
      </button>
    </div>
  )
}
