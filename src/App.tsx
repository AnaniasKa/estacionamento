import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import AccessError from './components/AccessError'
import AppLayout from './components/AppLayout'
import EnvError from './components/EnvError'
import Splash from './components/Splash'
import { AuthProvider, useSession } from './hooks/useSession'
import { missingEnv } from './lib/supabase'
import BillForm from './pages/BillForm'
import History from './pages/History'
import Home from './pages/Home'
import Login from './pages/Login'
import Settings from './pages/Settings'

/** Só deixa passar quem tem sessão e é membro. */
function RequireAuth() {
  const { decision } = useSession()
  if (decision === 'loading') return <Splash />
  if (decision === 'error') return <AccessError />
  if (decision === 'login') return <Navigate to="/login" replace />
  return <Outlet />
}

export default function App() {
  if (missingEnv.length > 0) return <EnvError missing={missingEnv} />

  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<RequireAuth />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/boleto" element={<BillForm />} />
            <Route path="/historico" element={<History />} />
            <Route path="/ajustes" element={<Settings />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}
