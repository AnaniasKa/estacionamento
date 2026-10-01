import { useEffect, useRef, useState } from 'react'
import { useSession } from '../hooks/useSession'
import type { Bill } from '../lib/bills'
import { downloadBillPdf } from '../lib/pdf'
import { markWhatsappOpened } from '../lib/queries'
import {
  buildShareMessage,
  buildWaUrl,
  decideShareActions,
  formatSharedAt,
  shareFileName,
  type FileState,
} from '../lib/share'
import type { Person } from '../lib/types'

/** O navegador consegue compartilhar um PDF? Testa com um arquivo vazio de mesmo tipo. */
function supportsFileShare(): boolean {
  try {
    if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') return false
    if (typeof navigator.canShare !== 'function') return false
    return navigator.canShare({ files: [new File([], 'teste.pdf', { type: 'application/pdf' })] })
  } catch {
    return false
  }
}

interface Props {
  bill: Bill
  /** Quem paga o boleto (bills.payer_id): o destinatário. */
  recipient: Person | undefined
  onShared: (billId: string, openedAt: string) => void
}

/**
 * Compartilhar no WhatsApp, só para quem NÃO é o pagador. Tudo manual: nenhum envio automático.
 * O PDF é baixado para a memória ao abrir, para o navigator.share poder rodar síncrono no clique.
 */
export default function ShareBlock({ bill, recipient, onShared }: Props) {
  const { member } = useSession()
  const [canShareFiles] = useState(supportsFileShare)
  const [fileState, setFileState] = useState<FileState>('idle')
  const [failure, setFailure] = useState<'not-found' | 'network' | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const fileRef = useRef<File | null>(null)

  const hasPdf = bill.attachment_path !== null
  const isPayer = member?.id === bill.payer_id
  const actions = decideShareActions({
    isPayer,
    hasPdf,
    hasBarcode: bill.barcode !== null,
    canShareFiles,
    fileState,
    hasPhone: !!recipient?.phone,
  })

  // Baixa o PDF para a memória assim que a tela abre (só se vai poder anexá-lo).
  const path = bill.attachment_path
  const wantsFile = !isPayer && path !== null && canShareFiles
  useEffect(() => {
    if (!wantsFile || !path) return
    let cancelled = false
    fileRef.current = null
    setFileState('loading')
    setFailure(null)
    void downloadBillPdf(path, shareFileName(bill.month)).then((result) => {
      if (cancelled) return
      if (result.ok) {
        fileRef.current = result.file
        setFileState('ready')
      } else {
        setFailure(result.reason)
        setFileState('failed')
      }
    })
    return () => {
      cancelled = true
    }
  }, [wantsFile, path, bill.month])

  useEffect(() => {
    if (!note) return
    const t = window.setTimeout(() => setNote(null), 4000)
    return () => window.clearTimeout(t)
  }, [note])

  if (!actions.visible) return null

  // Origem + caminho base (sem o #): é onde o app está publicado.
  const appUrl = `${window.location.origin}${window.location.pathname}`
  const chatUrl = buildWaUrl(recipient?.phone, buildShareMessage(bill, 'link', appUrl))

  async function record() {
    try {
      onShared(bill.id, await markWhatsappOpened(bill.id))
    } catch {
      setNote('Não foi possível registrar o compartilhamento.')
    }
  }

  // Sem await antes do navigator.share: ele precisa rodar de forma síncrona dentro do toque.
  function onShare() {
    const file = fileRef.current
    if (!file) return
    const text = buildShareMessage(bill, 'file', appUrl)
    let sharing: Promise<void>
    try {
      sharing = navigator.share({ files: [file], text, title: 'Boleto do estacionamento' })
    } catch {
      setNote('Não foi possível abrir o compartilhamento. Tente "Abrir conversa".')
      return
    }
    sharing.then(
      () => void record(), // só grava depois de a promessa resolver
      (err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return // cancelou: sem aviso
        setNote('Não foi possível abrir o compartilhamento. Tente "Abrir conversa".')
      },
    )
  }

  return (
    <div className="stack-sm">
      {actions.primary && (
        <button type="button" className="btn-primary" onClick={onShare} disabled={actions.primary === 'loading'}>
          {actions.primary === 'loading' ? 'Preparando o PDF…' : 'Enviar no WhatsApp'}
        </button>
      )}

      {actions.pdfFailed && (
        <p className="note" role="status">
          {failure === 'not-found' ? 'PDF não encontrado.' : 'Não foi possível carregar o PDF.'} Use "Abrir
          conversa".
        </p>
      )}

      <a
        className={`btn${actions.primary ? '' : ' btn-primary'}`}
        href={chatUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => void record()}
      >
        Abrir conversa
      </a>
      {actions.chatWithoutPdfHint && (
        <p className="note">O PDF não vai junto nesse modo. Quem recebe pode abri-lo no app.</p>
      )}
      {!actions.chatWithPhone && <p className="note">Sem telefone cadastrado: você escolhe o contato.</p>}

      {bill.whatsapp_opened_at && <p className="note">{formatSharedAt(bill.whatsapp_opened_at)}</p>}
      <p className="note" role="status" aria-live="polite">
        {note}
      </p>
    </div>
  )
}
