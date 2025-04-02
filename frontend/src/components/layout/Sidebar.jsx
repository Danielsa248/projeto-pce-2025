// Sidebar.jsx
import { NavLink } from 'react-router-dom';
import './Sidebar.css';

export default function Sidebar({ isVisible }) {
  return (
    <aside className={`sidebar ${isVisible ? 'visible' : 'hidden'}`}>
      <nav>
        <NavLink to="/" className="nav-link">
          Início
        </NavLink>
        <NavLink to="medicao-glicose/" className="nav-link">
          Medição de Glicose
        </NavLink>
        <NavLink to="medicao-insulina/" className="nav-link">
          Medição de Insulina
        </NavLink>
        <NavLink to="agenda/" className="nav-link">
          Agenda
        </NavLink>
        <NavLink to="historico/" className="nav-link">
          Histórico</NavLink>
        <NavLink to="opcoes/" className="nav-link">
          Opções
        </NavLink>
      </nav>
    </aside>
  );
}
