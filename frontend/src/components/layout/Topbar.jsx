// Topbar.jsx
import { Navbar, Button, Dropdown } from 'react-bootstrap';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FaBars, FaBell, FaCog } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import './Topbar.css';

export default function Topbar({ toggleSidebar, sidebarVisible }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  

  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  

  const getPageName = (path) => {
    const pageMappings = {
      '': 'Início',
      'opcoes': 'Opções',
      'login': 'Login',
      'registo': 'Registo',
      'medicao-glicose': 'Medição de Glicose',
      'medicao-insulina': 'Medição de Insulina',
      'agenda': 'Agenda',
      'historico': 'Histórico',
      'estatisticas': 'Estatísticas',
      'perfil': 'Perfil',
    };
    
    if (pageMappings[path.substring(1)]) {
      return pageMappings[path.substring(1)];
    }
  };

  return (
    <Navbar variant="dark" className="px-3 topbar fixed-top">
      <Button
        variant="outline-light"
        className={`hamburger-button ${sidebarVisible ? 'sidebar-open' : ''}`}
        onClick={toggleSidebar}
      >
        <FaBars />
      </Button>
      
      <div className="page-name-container ms-3">
        {getPageName(location.pathname)}
      </div>

      <Navbar.Collapse className="justify-content-end align-items-center">
        {user ? (
          <>
            <Navbar.Text className="me-3">
              {user.username || 'User'}
            </Navbar.Text>
            <Button
              variant="outline-light"
              className="topbar-icon-button me-2"
            >
              <FaBell />
            </Button>
            <Dropdown align="end">
              <Dropdown.Toggle
                variant="outline-light"
                className="topbar-icon-button"
                id="settings-dropdown"
              >
                <FaCog />
              </Dropdown.Toggle>
              <Dropdown.Menu>
                <Dropdown.Item onClick={handleLogout}>Logout</Dropdown.Item>
                <Dropdown.Divider />
                <Dropdown.Item as={Link} to="/opcoes">Opções</Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          </>
        ) : (
          <Dropdown align="end">
            <Dropdown.Toggle
              variant="outline-light"
              className="topbar-icon-button"
              id="settings-dropdown"
            >
              <FaCog />
            </Dropdown.Toggle>
            <Dropdown.Menu>
              <Dropdown.Item as={Link} to="/login">Login</Dropdown.Item>
              <Dropdown.Item as={Link} to="/registo">Registo</Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
        )}
      </Navbar.Collapse>
    </Navbar>
  );
}
