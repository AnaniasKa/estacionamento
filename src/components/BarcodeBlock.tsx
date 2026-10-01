import { useEffect, useRef, useState } from 'react'
import { formatBarcode } from '../lib/barcode'
import { copyText } from '../lib/clipboard'
import { openBillPdf } from '../lib/pdf'
import { CopyIcon, FileIcon } from './icons'

interface Props {
  barcode: string | null
  attachmentPath: string | null
}

/** "Código do boleto": linha digitável, Copiar e Ver PDF. */
export default function BarcodeBlock({ barcode, attachmentPath }: Props) {
  const codeRef = useRef<HTMLParagraphElement>(null)
  const [note, setNote] = useState<string | null>(null)
  const [opening, setOpening] = useState(false)

  // A mensagem de feedback some sozinha.
  useEffect(() => {
    if (!note) return
    const t = window.setTimeout(() => setNote(null), 3500)
    return () => window.clearTimeout(t)
  }, [note])

  async function onCopy() {
    if (!barcode) return
    if (await copyText(barcode)) {
      setNote('Copiado')
      return
    }
    // Sem acesso à área de transferência: seleciona o código para o usuário copiar à mão.
    const el = codeRef.current
    if (el) {
      const range = document.createRange()
      range.selectNodeContents(el)
      const selection = window.getSelection()
      selection?.removeAllRanges()
      selection?.addRange(range)
    }
    setNote('Não foi possível copiar. Selecionei o código: copie manualmente.')
  }

  async function onOpenPdf() {
    if (!attachmentPath || opening) return
    setOpening(true)
    const result = await openBillPdf(attachmentPath)
    setOpening(false)
    if (result === 'not-found') setNote('PDF não encontrado')
    else if (result === 'network') setNote('Sem conexão. Tente de novo.')
  }

  return (
    <section className="card stack" aria-label="Código do boleto">
      <p className="mini-label">Código do boleto</p>
      {barcode ? (
        <p ref={codeRef} className="mono barcode">
          {formatBarcode(barcode)}
        </p>
      ) : (
        <p className="muted">Sem linha digitável. Use o PDF.</p>
      )}
      <div className="row">
        {barcode && (
          <button type="button" onClick={onCopy}>
            <CopyIcon width={18} height={18} /> Copiar
          </button>
        )}
        {attachmentPath && (
          <button type="button" onClick={onOpenPdf} disabled={opening}>
            <FileIcon width={18} height={18} /> {opening ? 'Abrindo…' : 'Ver PDF'}
          </button>
        )}
      </div>
      <p className="note" role="status" aria-live="polite">
        {note}
      </p>
    </section>
  )
}
