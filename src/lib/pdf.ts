import { isNetworkError } from './authErrors'
import { supabase } from './supabase'

export type PdfResult = 'ok' | 'not-found' | 'network'

const BUCKET = 'boletos'
const SIGNED_URL_SECONDS = 600 // 10 minutos

/**
 * Abre o PDF do boleto por URL assinada (expira em 10 minutos) em nova aba.
 * A aba é aberta já no clique (antes da espera) para o navegador não bloquear o pop-up.
 * Antes de assinar, confere se o objeto existe: assinar não garante que o arquivo está lá,
 * e uma URL para objeto apagado abriria uma aba com erro em vez de mostrar a mensagem.
 */
export async function openBillPdf(path: string): Promise<PdfResult> {
  const win = window.open('', '_blank')
  try {
    const exists = await supabase.storage.from(BUCKET).exists(path)
    if (exists.error) {
      win?.close()
      return isNetworkError(exists.error) ? 'network' : 'not-found'
    }
    if (!exists.data) {
      win?.close()
      return 'not-found'
    }
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_SECONDS)
    if (error || !data?.signedUrl) {
      win?.close()
      return error && isNetworkError(error) ? 'network' : 'not-found'
    }
    if (win) {
      win.opener = null
      win.location.href = data.signedUrl
    } else {
      window.location.href = data.signedUrl
    }
    return 'ok'
  } catch {
    win?.close()
    return 'network'
  }
}

export type PdfDownload = { ok: true; file: File } | { ok: false; reason: 'not-found' | 'network' }

/**
 * Baixa o PDF pela sessão (bucket privado, só membros) e monta um File em memória, pronto para
 * navigator.share. O limite do bucket é 5 MB, então guardar o arquivo na memória é seguro.
 */
export async function downloadBillPdf(path: string, fileName: string): Promise<PdfDownload> {
  try {
    const { data, error } = await supabase.storage.from(BUCKET).download(path)
    if (error) return { ok: false, reason: isNetworkError(error) ? 'network' : 'not-found' }
    if (!data || data.size === 0) return { ok: false, reason: 'not-found' }
    return { ok: true, file: new File([data], fileName, { type: 'application/pdf' }) }
  } catch {
    return { ok: false, reason: 'network' }
  }
}

/** Sobe o PDF para <bill_id>/<timestamp>.pdf. O nome novo nunca colide com o do PDF anterior. */
export async function uploadBillPdf(billId: string, file: File): Promise<string> {
  const path = `${billId}/${Date.now()}.pdf`
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: 'application/pdf', upsert: false })
  if (error) throw new Error('upload-failed')
  return path
}

/** Remove um PDF; falha não propaga (é limpeza). Devolve se conseguiu. */
export async function removeBillPdf(path: string): Promise<boolean> {
  try {
    // Sem erro e sem itens removidos = nada foi apagado (ex.: bloqueado por policy).
    const { data, error } = await supabase.storage.from(BUCKET).remove([path])
    return !error && (data?.length ?? 0) > 0
  } catch {
    return false
  }
}
