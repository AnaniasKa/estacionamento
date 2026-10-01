/** Estado de carregamento enquanto a sessão é restaurada (evita flash da tela de login). */
export default function Splash() {
  return (
    <main className="page splash" aria-busy="true" aria-live="polite">
      <p className="muted">Carregando…</p>
    </main>
  )
}
