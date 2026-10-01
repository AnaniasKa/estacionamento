/** Dados de um membro visíveis nas telas (sem e-mail). */
export interface Person {
  id: string
  name: string
  phone: string | null
}

/** Linha de public.members. */
export interface Member {
  id: string
  name: string
  email: string
  phone: string | null
}
