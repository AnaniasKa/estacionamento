import { useCallback, useEffect, useState } from 'react'

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

/**
 * Estado de salvamento de um bloco. "Salvo" some sozinho; o erro fica até a próxima tentativa.
 * Cada bloco tem o seu, então salvar um não mexe no que se edita em outro.
 */
export function useSaveState() {
  const [status, setStatus] = useState<SaveStatus>('idle')
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (status !== 'saved') return
    const t = window.setTimeout(() => setStatus('idle'), 3000)
    return () => window.clearTimeout(t)
  }, [status])

  const start = useCallback(() => {
    setStatus('saving')
    setMessage(null)
  }, [])
  const succeed = useCallback(() => setStatus('saved'), [])
  const fail = useCallback((text: string) => {
    setStatus('error')
    setMessage(text)
  }, [])

  return { status, message, saving: status === 'saving', start, succeed, fail }
}
