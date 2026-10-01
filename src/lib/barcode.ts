// Linha digitável: aceita pontos e espaços na entrada, guarda só dígitos.
// Boleto bancário tem 47 dígitos; boleto de arrecadação/convênio, 48.

export const BARCODE_LENGTHS = [47, 48] as const

export type BarcodeResult =
  | { ok: true; digits: string }
  | { ok: false; error: string }

export function validateBarcode(input: string): BarcodeResult {
  const trimmed = input.trim()
  if (trimmed === '') return { ok: false, error: 'Informe a linha digitável.' }
  if (/[^\d.\s]/.test(trimmed)) {
    return { ok: false, error: 'Use apenas números, pontos e espaços.' }
  }
  const digits = trimmed.replace(/\D/g, '')
  if (digits.length === 44) {
    return {
      ok: false,
      error:
        'Esse é o código de barras (44 dígitos). Cole a linha digitável, que tem 47 ou 48 dígitos.',
    }
  }
  if (!(BARCODE_LENGTHS as readonly number[]).includes(digits.length)) {
    return {
      ok: false,
      error: `A linha digitável deve ter 47 ou 48 dígitos (tem ${digits.length}).`,
    }
  }
  return { ok: true, digits }
}

/** Só para exibição: separa os dígitos em blocos de 5 para leitura. */
export function formatBarcode(digits: string): string {
  return digits.replace(/(\d{5})(?=\d)/g, '$1 ')
}
