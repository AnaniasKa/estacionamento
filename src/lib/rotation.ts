// Regra do rodízio. Datas são strings 'YYYY-MM-DD' (nunca Date com fuso, para
// não escorregar um dia). Meses são sempre o primeiro dia: 'YYYY-MM-01'.

export interface RotationSettings {
  firstMonth: string // 'YYYY-MM-DD' (normalizado para o dia 1)
  firstPayerId: string
}

/** O que o rodízio precisa saber de um boleto já lançado. */
export interface BillPayer {
  payerId: string
}

const MONTH_RE = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/

function parseYearMonth(value: string): { year: number; month: number } {
  const m = MONTH_RE.exec(value)
  if (!m) throw new Error(`Data inválida: ${value}`)
  const year = Number(m[1])
  const month = Number(m[2])
  if (month < 1 || month > 12) throw new Error(`Mês inválido: ${value}`)
  return { year, month }
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/** Normaliza qualquer 'YYYY-MM' ou 'YYYY-MM-DD' para o primeiro dia do mês. */
export function monthStart(value: string): string {
  const { year, month } = parseYearMonth(value)
  return `${year}-${pad(month)}-01`
}

/** Mês de uma data local (usa ano/mês locais, não UTC). */
export function monthOfDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-01`
}

export function addMonths(value: string, delta: number): string {
  const { year, month } = parseYearMonth(value)
  const index = year * 12 + (month - 1) + delta
  const y = Math.floor(index / 12)
  const m = index - y * 12
  return `${y}-${pad(m + 1)}-01`
}

export function previousMonth(value: string): string {
  return addMonths(value, -1)
}

function monthIndex(value: string): number {
  const { year, month } = parseYearMonth(value)
  return year * 12 + (month - 1)
}

/**
 * Pagador pela paridade de meses desde first_month: no mês inicial paga
 * first_payer; no seguinte, o outro; e assim por diante (vale também para
 * meses anteriores ao inicial).
 */
export function rotationPayer(
  month: string,
  settings: RotationSettings,
  memberIds: readonly [string, string],
): string {
  const { firstPayerId } = settings
  const idx = memberIds.indexOf(firstPayerId)
  if (idx === -1) throw new Error('first_payer_id não está entre os membros')
  if (memberIds[0] === memberIds[1]) throw new Error('Os dois membros precisam ser distintos')
  const other = memberIds[1 - idx]
  const diff = monthIndex(month) - monthIndex(settings.firstMonth)
  return ((diff % 2) + 2) % 2 === 0 ? firstPayerId : other
}

/**
 * Pagador efetivo de um mês. Se já existe boleto, o pagador é SEMPRE o
 * bills.payer_id gravado no lançamento (congelado: mudar os Ajustes depois não
 * reescreve o passado). O rodízio por paridade só vale para meses sem boleto.
 */
export function resolvePayer(
  month: string,
  settings: RotationSettings,
  memberIds: readonly [string, string],
  bill?: BillPayer | null,
): string {
  if (bill) return bill.payerId
  return rotationPayer(month, settings, memberIds)
}

export interface RotationContext {
  ids: readonly [string, string]
  settings: RotationSettings
}

/**
 * Só existe rodízio com settings e exatamente dois membros, e com o pagador inicial entre eles.
 * Caso contrário devolve null e a tela mostra "Rodízio ainda não configurado" sem chamar as
 * funções de rotação.
 */
export function getRotation(
  people: readonly { id: string }[],
  settings: RotationSettings | null | undefined,
): RotationContext | null {
  if (!settings || people.length !== 2) return null
  const ids = [people[0].id, people[1].id] as const
  if (ids[0] === ids[1] || !ids.includes(settings.firstPayerId)) return null
  if (!MONTH_RE.test(settings.firstMonth)) return null
  return { ids, settings }
}

/** Valor de payer_override ao lançar: true quando o escolhido difere do rodízio do mês. */
export function isPayerOverride(
  month: string,
  chosenPayerId: string,
  settings: RotationSettings,
  memberIds: readonly [string, string],
): boolean {
  return chosenPayerId !== rotationPayer(month, settings, memberIds)
}
