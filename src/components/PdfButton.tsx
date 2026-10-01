import { useEffect, useState } from 'react'
import { openBillPdf } from '../lib/pdf'
import { FileIcon } from './icons'

/** "Ver PDF" com o mesmo tratamento do Início: PDF ausente e falta de conexão viram mensagem. */
export default function PdfButton({ path }: { path: string }) {
  const [note, setNote] = useState<string | null>(null)
  const [opening, setOpening] = useState(false)

  useEffect(() => {
    if (!note) return
    const t = window.setTimeout(() => setNote(null), 3500)
    return () => window.clearTimeout(t)
  }, [note])

  async function onOpen() {
    if (opening) return
    setOpening(true)
    const result = await openBillPdf(path)
    setOpening(false)
    if (result === 'not-found') setNote('PDF não encontrado')
    else if (result === 'network') setNote('Sem conexão. Tente de novo.')
  }

  return (
    <div className="stack-sm">
      <button type="button" onClick={onOpen} disabled={opening}>
        <FileIcon width={18} height={18} /> {opening ? 'Abrindo…' : 'Ver PDF'}
      </button>
      <p className="note" role="status" aria-live="polite">
        {note}
      </p>
    </div>
  )
}
