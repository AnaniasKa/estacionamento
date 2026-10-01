import type { SaveStatus } from './useSaveState'

/** "Salvo" curto ou a frase de erro de um bloco. */
export default function StatusLine({ status, message }: { status: SaveStatus; message: string | null }) {
  if (status === 'saved') {
    return (
      <p className="success" role="status">
        Salvo
      </p>
    )
  }
  if (status === 'error' && message) {
    return (
      <p className="error" role="alert">
        {message}
      </p>
    )
  }
  return null
}
