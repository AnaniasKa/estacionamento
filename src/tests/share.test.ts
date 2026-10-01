import { describe, expect, it } from 'vitest'
import {
  buildShareMessage,
  buildWaUrl,
  decideShareActions,
  formatSharedAt,
  shareFileName,
  type ShareContext,
} from '../lib/share'

const LINE = '12345678901234567890123456789012345678901234567'
const withCode = { month: '2026-10-01', amount: 1234.5, due_date: '2026-10-10', barcode: LINE }
const onlyPdf = { ...withCode, barcode: null }
const APP = 'https://exemplo.github.io/estacionamento/'

describe('buildShareMessage', () => {
  it('com linha digitável, só com dígitos', () => {
    expect(buildShareMessage(withCode, 'file', APP)).toBe(
      `Boleto do estacionamento de outubro/2026: R$ 1.234,50, vence em 10/10. Código: ${LINE}`,
    )
    expect(buildShareMessage(withCode, 'link', APP)).toBe(buildShareMessage(withCode, 'file', APP))
  })
  it('limpa pontos e espaços do código guardado', () => {
    expect(buildShareMessage({ ...withCode, barcode: '12345 67890.12' }, 'link', APP)).toContain('Código: 123456789012')
  })
  it('só PDF: anexo no modo arquivo, link do app no modo sem arquivo', () => {
    expect(buildShareMessage(onlyPdf, 'file', APP)).toBe(
      'Boleto do estacionamento de outubro/2026: R$ 1.234,50, vence em 10/10. O PDF está em anexo.',
    )
    expect(buildShareMessage(onlyPdf, 'link', APP)).toBe(
      `Boleto do estacionamento de outubro/2026: R$ 1.234,50, vence em 10/10. O PDF está no app: ${APP}.`,
    )
  })
  it('usa espaço comum depois de R$', () => {
    expect(buildShareMessage(onlyPdf, 'file', APP)).not.toContain(' ')
  })
})

describe('buildWaUrl', () => {
  it('com telefone', () => {
    expect(buildWaUrl('5511999999999', 'oi')).toBe('https://wa.me/5511999999999?text=oi')
  })
  it('sem telefone (null, vazio ou inválido) abre o seletor de contatos', () => {
    expect(buildWaUrl(null, 'oi')).toBe('https://wa.me/?text=oi')
    expect(buildWaUrl('', 'oi')).toBe('https://wa.me/?text=oi')
    expect(buildWaUrl('12ab', 'oi')).toBe('https://wa.me/?text=oi')
  })
  it('codifica acentos, espaços e caracteres especiais', () => {
    const url = buildWaUrl('5511999999999', 'Código: R$ 1,50 & mais?')
    expect(url).toBe('https://wa.me/5511999999999?text=C%C3%B3digo%3A%20R%24%201%2C50%20%26%20mais%3F')
    expect(new URL(url).searchParams.get('text')).toBe('Código: R$ 1,50 & mais?')
  })
})

describe('decideShareActions', () => {
  const base: ShareContext = {
    isPayer: false,
    hasPdf: true,
    hasBarcode: true,
    canShareFiles: true,
    fileState: 'ready',
    hasPhone: true,
  }

  it('o pagador não vê nenhum botão', () => {
    const a = decideShareActions({ ...base, isPayer: true })
    expect(a.visible).toBe(false)
    expect(a.primary).toBeNull()
    expect(a.openChat).toBe(false)
  })
  it('quem não paga, com PDF e suporte, vê o principal e a reserva', () => {
    const a = decideShareActions(base)
    expect(a).toMatchObject({ visible: true, primary: 'share', openChat: true, chatWithPhone: true, pdfFailed: false })
    expect(a.chatWithoutPdfHint).toBe(true)
  })
  it('enquanto o PDF carrega, o principal fica em carregamento', () => {
    expect(decideShareActions({ ...base, fileState: 'loading' }).primary).toBe('loading')
    expect(decideShareActions({ ...base, fileState: 'idle' }).primary).toBe('loading')
  })
  it('PDF que falhou: sem principal, com aviso, e a reserva continua', () => {
    const a = decideShareActions({ ...base, fileState: 'failed' })
    expect(a).toMatchObject({ primary: null, pdfFailed: true, openChat: true })
  })
  it('sem suporte a compartilhar arquivo: só a reserva', () => {
    const a = decideShareActions({ ...base, canShareFiles: false, fileState: 'idle' })
    expect(a).toMatchObject({ primary: null, openChat: true, pdfFailed: false })
  })
  it('sem PDF: só a reserva e sem aviso de PDF', () => {
    const a = decideShareActions({ ...base, hasPdf: false, fileState: 'idle' })
    expect(a).toMatchObject({ visible: true, primary: null, openChat: true, chatWithoutPdfHint: false })
  })
  it('sem telefone: abre o seletor de contatos', () => {
    expect(decideShareActions({ ...base, hasPhone: false }).chatWithPhone).toBe(false)
  })
  it('sem PDF e sem linha digitável, esconde tudo', () => {
    const a = decideShareActions({ ...base, hasPdf: false, hasBarcode: false })
    expect(a.visible).toBe(false)
    expect(a.openChat).toBe(false)
  })
})

describe('nome do arquivo e "Compartilhado em"', () => {
  it('nome do arquivo', () => {
    expect(shareFileName('2026-10-01')).toBe('boleto-estacionamento-10-2026.pdf')
    expect(shareFileName('2027-01-01')).toBe('boleto-estacionamento-01-2027.pdf')
  })
  it('hora local do aparelho, com zero à esquerda', () => {
    const iso = new Date(2026, 9, 2, 9, 5, 0).toISOString()
    expect(formatSharedAt(iso)).toBe('Compartilhado em 02/10 às 09:05')
  })
  it('nunca diz "Enviado"', () => {
    expect(formatSharedAt(new Date().toISOString())).not.toMatch(/enviad/i)
  })
})
