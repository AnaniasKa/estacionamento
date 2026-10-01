import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL?.trim()
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

/** Variáveis de ambiente que faltam. Se não estiver vazio, o App mostra a tela de erro. */
export const missingEnv: string[] = [
  !url ? 'VITE_SUPABASE_URL' : '',
  !anonKey ? 'VITE_SUPABASE_ANON_KEY' : '',
].filter(Boolean)

// Só a anon key vive no frontend (a proteção real é a RLS). Com variável ausente, o cliente
// usa valores inertes e nunca é chamado, porque o App não monta nada além da tela de erro.
export const supabase = createClient(url || 'http://localhost', anonKey || 'missing', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false, // sem link mágico
  },
})
