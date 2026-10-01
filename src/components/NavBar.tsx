import { NavLink } from 'react-router-dom'
import { HistoryIcon, HomeIcon, SettingsIcon } from './icons'

const items = [
  { to: '/', label: 'Início', Icon: HomeIcon, end: true },
  { to: '/historico', label: 'Histórico', Icon: HistoryIcon, end: false },
  { to: '/ajustes', label: 'Ajustes', Icon: SettingsIcon, end: false },
]

/** Barra de navegação inferior. */
export default function NavBar() {
  return (
    <nav className="navbar" aria-label="Principal">
      <div className="navbar-inner">
        {items.map(({ to, label, Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            <Icon />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
