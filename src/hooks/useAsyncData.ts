import { useCallback, useEffect, useState } from 'react'

export type AsyncState<T> =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; data: T }

/**
 * Carrega dados com estados de carregamento e erro. Recarrega quando `deps` mudam ou em reload().
 * update() altera os dados já carregados (ex.: depois de marcar como pago) sem piscar o carregamento.
 */
export function useAsyncData<T>(load: () => Promise<T>, deps: readonly unknown[]) {
  const [state, setState] = useState<AsyncState<T>>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    setState({ status: 'loading' })
    load().then(
      (data) => {
        if (!cancelled) setState({ status: 'ready', data })
      },
      () => {
        if (!cancelled) setState({ status: 'error' })
      },
    )
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, attempt])

  const reload = useCallback(() => setAttempt((n) => n + 1), [])
  const update = useCallback(
    (fn: (data: T) => T) => setState((s) => (s.status === 'ready' ? { status: 'ready', data: fn(s.data) } : s)),
    [],
  )

  return { state, reload, update }
}
