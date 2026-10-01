import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import AccessError from '../components/AccessError'
import Splash from '../components/Splash'
import { useSession } from '../hooks/useSession'
import { signIn } from '../lib/auth'

export default function Login() {
  const { decision, notice, clearNotice } = useSession()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (decision === 'loading') return <Splash />
  if (decision === 'allowed') return <Navigate to="/" replace />
  if (decision === 'error') return <AccessError />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)
    setError(null)
    clearNotice()
    const { error: message } = await signIn(email, password)
    // Em caso de sucesso a sessão muda e esta tela é substituída; só reabilita o botão se falhar.
    if (message) {
      setError(message)
      setSubmitting(false)
    }
  }

  const shown = error ?? notice

  return (
    <main className="page">
      <h1 className="page-title">Estacionamento</h1>
      <form className="card stack" onSubmit={onSubmit} noValidate>
        <label className="field">
          <span>E-mail</span>
          <input
            type="email"
            name="email"
            autoComplete="email"
            inputMode="email"
            autoCapitalize="none"
            spellCheck={false}
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="field">
          <span>Senha</span>
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {shown && (
          <p className="error" role="alert">
            {shown}
          </p>
        )}
        <button type="submit" className="btn-primary" disabled={submitting || !email || !password}>
          {submitting ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </main>
  )
}
