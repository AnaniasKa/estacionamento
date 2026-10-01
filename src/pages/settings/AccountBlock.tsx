import { useState, type FormEvent } from 'react'
import { updateMember } from '../../lib/queries'
import { normalizePhone, validateName } from '../../lib/settingsRules'
import type { Person } from '../../lib/types'
import StatusLine from './StatusLine'
import { useSaveState } from './useSaveState'

/** Conta: nome e telefone de cada membro (os dois podem editar os dois). */
export default function AccountBlock({
  people,
  meId,
  onSaved,
}: {
  people: Person[]
  meId: string
  onSaved: (id: string, name: string, phone: string | null) => void
}) {
  // Eu primeiro.
  const ordered = [...people].sort((a, b) => Number(b.id === meId) - Number(a.id === meId))
  return (
    <section className="stack" aria-label="Conta">
      <h2 className="section-title">Conta</h2>
      {ordered.map((p) => (
        <MemberForm key={p.id} person={p} isMe={p.id === meId} onSaved={onSaved} />
      ))}
    </section>
  )
}

function MemberForm({
  person,
  isMe,
  onSaved,
}: {
  person: Person
  isMe: boolean
  onSaved: (id: string, name: string, phone: string | null) => void
}) {
  const [name, setName] = useState(person.name)
  const [phone, setPhone] = useState(person.phone ?? '')
  const [nameError, setNameError] = useState<string | null>(null)
  const [phoneError, setPhoneError] = useState<string | null>(null)
  const save = useSaveState()

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (save.saving) return
    const n = validateName(name)
    const p = normalizePhone(phone)
    setNameError(n.ok ? null : n.error)
    setPhoneError(p.ok ? null : p.error)
    if (!n.ok || !p.ok) return

    save.start()
    try {
      await updateMember(person.id, n.name, p.phone)
      setName(n.name)
      setPhone(p.phone ?? '')
      onSaved(person.id, n.name, p.phone)
      save.succeed()
    } catch {
      save.fail('Não foi possível salvar. Verifique a conexão e tente de novo.')
    }
  }

  return (
    <form className="card stack" onSubmit={onSubmit} noValidate>
      <h3 className="section-title">{isMe ? 'Você' : 'Outra pessoa'}</h3>
      <label className="field">
        <span>Nome</span>
        <input
          type="text"
          autoComplete={isMe ? 'name' : 'off'}
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-invalid={nameError ? true : undefined}
        />
        {nameError && <small className="field-error">{nameError}</small>}
      </label>
      <label className="field">
        <span>Telefone (com DDI e DDD)</span>
        <input
          type="tel"
          inputMode="tel"
          autoComplete="off"
          placeholder="5511999999999"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          aria-invalid={phoneError ? true : undefined}
        />
        <small className="muted">Só números, de 10 a 15 dígitos. Exemplo: 5511999999999. Vazio apaga o telefone.</small>
        {phoneError && <small className="field-error">{phoneError}</small>}
      </label>
      <StatusLine status={save.status} message={save.message} />
      <button type="submit" className="btn-primary" disabled={save.saving}>
        {save.saving ? 'Salvando…' : 'Salvar'}
      </button>
    </form>
  )
}
