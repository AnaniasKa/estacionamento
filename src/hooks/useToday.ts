import { useEffect, useState } from 'react'
import { todayLocal } from '../lib/dates'

/**
 * "Hoje" no calendário local. Ao voltar o foco para a aba, recalcula; só troca o valor (e
 * portanto só dispara nova consulta em quem depende dele) se o dia realmente mudou.
 */
export function useToday(): string {
  const [today, setToday] = useState(() => todayLocal())

  useEffect(() => {
    function onVisible() {
      if (document.visibilityState !== 'visible') return
      setToday((current) => {
        const now = todayLocal()
        return now === current ? current : now
      })
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  return today
}
