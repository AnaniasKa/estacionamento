import { Outlet } from 'react-router-dom'
import NavBar from './NavBar'

/** Moldura das telas protegidas: conteúdo + navegação inferior. */
export default function AppLayout() {
  return (
    <>
      <div className="with-nav">
        <Outlet />
      </div>
      <NavBar />
    </>
  )
}
