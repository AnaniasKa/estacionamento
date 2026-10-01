// Datas como string 'YYYY-MM-DD'. "Hoje" vem do calendário local do aparelho (nunca UTC).

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

export function todayLocal(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

function dayNumber(date: string): number {
  const [y, m, d] = date.split('-').map(Number)
  return Math.round(Date.UTC(y, m - 1, d) / 86_400_000)
}

/** Dias inteiros de `from` até `to` (positivo se `to` é depois). */
export function daysBetween(from: string, to: string): number {
  return dayNumber(to) - dayNumber(from)
}

/** Data local (YYYY-MM-DD) de um timestamp ISO, como 'paid_at'. */
export function localDateOfTimestamp(iso: string): string {
  return todayLocal(new Date(iso))
}
