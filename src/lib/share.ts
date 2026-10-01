// Regras puras do compartilhamento no WhatsApp: mensagem, link wa.me, ações visíveis e rótulos.
// Tudo manual: o app só monta o texto e abre o compartilhamento; quem toca em enviar é a pessoa.
import type { Bill } from './bills'
import { formatBRL, formatDayMonth, monthName } from './format'

export type ShareMessageMode = 'file' | 'link'

type MessageBill = Pick<Bill, 'month' | 'amount' | 'due_date' | 'barcode'>

/** "outubro/2026" (mês/ano em texto). */
export function monthYearShort(month: string): string {
  return `${monthName(month)}/${month.slice(0, 4)}`
}

/**
 * Texto da mensagem.
 *  - Com linha digitável: inclui o código só com dígitos.
 *  - Só PDF: modo 'file' diz que o PDF está em anexo; modo 'link' aponta para o app.
 */
export function buildShareMessage(bill: MessageBill, mode: ShareMessageMode, appUrl: string): string {
  // O Intl usa espaço sem quebra depois de "R$"; no texto do WhatsApp fica um espaço comum.
  const amount = formatBRL(bill.amount).replace(/ /g, ' ')
  const head = `Boleto do estacionamento de ${monthYearShort(bill.month)}: ${amount}, vence em ${formatDayMonth(bill.due_date)}.`
  if (bill.barcode) return `${head} Código: ${bill.barcode.replace(/\D/g, '')}`
  return mode === 'file' ? `${head} O PDF está em anexo.` : `${head} O PDF está no app: ${appUrl}.`
}

/** https://wa.me/<telefone>?text=…; sem telefone válido, o usuário escolhe o contato. */
export function buildWaUrl(phone: string | null | undefined, text: string): string {
  const digits = phone && /^\d{10,15}$/.test(phone) ? phone : ''
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`
}

/** "boleto-estacionamento-10-2026.pdf" */
export function shareFileName(month: string): string {
  return `boleto-estacionamento-${month.slice(5, 7)}-${month.slice(0, 4)}.pdf`
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/** "Compartilhado em 12/10 às 14:05" (hora local do aparelho). Nunca "Enviado". */
export function formatSharedAt(iso: string): string {
  const d = new Date(iso)
  return `Compartilhado em ${pad(d.getDate())}/${pad(d.getMonth() + 1)} às ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export type FileState = 'idle' | 'loading' | 'ready' | 'failed'

export interface ShareContext {
  isPayer: boolean
  hasPdf: boolean
  hasBarcode: boolean
  canShareFiles: boolean
  fileState: FileState
  hasPhone: boolean
}

export interface ShareActions {
  /** Algum botão aparece? Falso para o pagador e para boleto sem código e sem PDF. */
  visible: boolean
  /** "Enviar no WhatsApp" com PDF: 'loading' (desabilitado) ou 'share'; null se não há como anexar. */
  primary: 'share' | 'loading' | null
  /** "Abrir conversa" (sem PDF), sempre que visível. */
  openChat: boolean
  /** Abre direto na conversa do destinatário (true) ou no seletor de contatos (false). */
  chatWithPhone: boolean
  /** O PDF não pôde ser carregado para anexar. */
  pdfFailed: boolean
  /** Avisar que o PDF não vai junto no "Abrir conversa". */
  chatWithoutPdfHint: boolean
}

export function decideShareActions(c: ShareContext): ShareActions {
  const visible = !c.isPayer && (c.hasPdf || c.hasBarcode)
  const attachable = visible && c.hasPdf && c.canShareFiles
  const pdfFailed = attachable && c.fileState === 'failed'
  const primary: ShareActions['primary'] =
    attachable && !pdfFailed ? (c.fileState === 'ready' ? 'share' : 'loading') : null
  return {
    visible,
    primary,
    openChat: visible,
    chatWithPhone: c.hasPhone,
    pdfFailed,
    chatWithoutPdfHint: visible && c.hasPdf,
  }
}
