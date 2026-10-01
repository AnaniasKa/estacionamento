/** Tela de erro quando faltam variáveis de ambiente do Supabase. */
export default function EnvError({ missing }: { missing: string[] }) {
  return (
    <main className="page">
      <h1 className="page-title">Configuração incompleta</h1>
      <div className="card stack">
        <p>O app não encontrou estas variáveis de ambiente:</p>
        <ul className="list">
          {missing.map((name) => (
            <li key={name} className="mono">
              {name}
            </li>
          ))}
        </ul>
        <p className="muted">
          Copie <span className="mono">.env.example</span> para <span className="mono">.env</span>, preencha com
          os valores do seu projeto Supabase e reinicie o servidor. No GitHub Pages, cadastre-as nas variáveis do
          repositório e publique de novo.
        </p>
      </div>
    </main>
  )
}
