// Sidebar.jsx
import { Nav } from 'react-bootstrap';
import { NavLink } from 'react-router-dom';

export default function Sidebar({ isVisible }) {
  return (
    <div
      className="bg-light h-100 position-fixed"
      style={{
        width: '240px',
        left: 0,
        transform: isVisible ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.3s ease',
        zIndex: 100,
        top: '56px' // Bootstrap navbar default height
      }}
    >
      <Nav className="flex-column">
        <Nav.Link as={NavLink} to="/" className="px-3 py-2">
          Início
        </Nav.Link>
        <Nav.Link as={NavLink} to="/medicao-glicose" className="px-3 py-2">
          Medição de Glicose
        </Nav.Link>
        <Nav.Link as={NavLink} to="/medicao-insulina" className="px-3 py-2">
          Medição de Insulina
        </Nav.Link>
        <Nav.Link as={NavLink} to="/agenda" className="px-3 py-2">
          Agenda
        </Nav.Link>
        <Nav.Link as={NavLink} to="/historico" className="px-3 py-2">
          Histórico
        </Nav.Link>
        <Nav.Link as={NavLink} to="/opcoes" className="px-3 py-2">
          Opções
        </Nav.Link>
      </Nav>
    </div>
  );
}
