import { useState, type FormEvent } from 'react'
import { changePassword } from '../../lib/auth'

/** Alterar senha (o mesmo formulário de antes, agora como bloco). */
export default function PasswordBlock() {
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (saving) return
    setSaving(true)
    setError(null)
    setDone(false)
    const { error: message } = await changePassword(password, confirmation)
    setSaving(false)
    if (message) {
      setError(message)
      return
    }
    setPassword('')
    setConfirmation('')
    setDone(true)
  }

  return (
    <form className="card stack" onSubmit={onSubmit} noValidate>
      <h2 className="section-title">Alterar senha</h2>
      <label className="field">
        <span>Nova senha</span>
        <input
          type="password"
          name="new-password"
          autoComplete="new-password"
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      <label className="field">
        <span>Confirmar nova senha</span>
        <input
          type="password"
          name="confirm-password"
          autoComplete="new-password"
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
        />
      </label>
      <p className="muted">Mínimo de 8 caracteres.</p>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {done && (
        <p className="success" role="status">
          Salvo
        </p>
      )}
      <button type="submit" className="btn-primary" disabled={saving || !password || !confirmation}>
        {saving ? 'Salvando…' : 'Alterar senha'}
      </button>
    </form>
  )
}
