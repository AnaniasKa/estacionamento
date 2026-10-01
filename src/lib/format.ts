// Formatação para a tela (pt-BR). Datas por string, sem Date com fuso.

const MONTHS = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
]

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export function formatBRL(value: number): string {
  return brl.format(value)
}

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

function yearMonth(date: string): { year: string; month: number } {
  const m = /^(\d{4})-(\d{2})/.exec(date)
  if (!m || Number(m[2]) < 1 || Number(m[2]) > 12) throw new Error(`Data inválida: ${date}`)
  return { year: m[1], month: Number(m[2]) }
}

/** 'setembro' */
export function monthName(date: string): string {
  return MONTHS[yearMonth(date).month - 1]
}

/** 'Outubro de 2026' */
export function monthYearLabel(date: string): string {
  const { year, month } = yearMonth(date)
  return `${capitalize(MONTHS[month - 1])} de ${year}`
}

/** '2026-10-10' -> '10/10' */
export function formatDayMonth(date: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(date)
  if (!m) throw new Error(`Data inválida: ${date}`)
  return `${m[3]}/${m[2]}`
}

/** '2026-10-10' -> '10/10/2026' */
export function formatDate(date: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(date)
  if (!m) throw new Error(`Data inválida: ${date}`)
  return `${m[3]}/${m[2]}/${m[1]}`
}
