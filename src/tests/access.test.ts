import { describe, expect, it } from 'vitest'
import { decideAccess } from '../lib/access'

describe('decideAccess', () => {
  it('enquanto a sessão é restaurada, fica em carregamento (sem flash de login)', () => {
    expect(decideAccess({ initializing: true, hasSession: false, memberStatus: 'idle' })).toBe('loading')
    expect(decideAccess({ initializing: true, hasSession: true, memberStatus: 'found' })).toBe('loading')
  })

  it('sem sessão, vai para o login', () => {
    expect(decideAccess({ initializing: false, hasSession: false, memberStatus: 'idle' })).toBe('login')
  })

  it('sessão sem membro, vai para o login (o signOut é feito pelo hook)', () => {
    expect(decideAccess({ initializing: false, hasSession: true, memberStatus: 'missing' })).toBe('login')
  })

  it('sessão com membro, libera o acesso', () => {
    expect(decideAccess({ initializing: false, hasSession: true, memberStatus: 'found' })).toBe('allowed')
  })

  it('com sessão, enquanto consulta members, continua em carregamento', () => {
    expect(decideAccess({ initializing: false, hasSession: true, memberStatus: 'idle' })).toBe('loading')
    expect(decideAccess({ initializing: false, hasSession: true, memberStatus: 'loading' })).toBe('loading')
  })

  it('falha ao consultar members não desloga nem libera: pede nova tentativa', () => {
    expect(decideAccess({ initializing: false, hasSession: true, memberStatus: 'error' })).toBe('error')
  })
})
