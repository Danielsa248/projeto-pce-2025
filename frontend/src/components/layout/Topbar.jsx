import { Navbar, Button, Dropdown, Badge } from 'react-bootstrap';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FaBars, FaBell, FaCog } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { useState, useRef, useEffect } from 'react';
import NotificationService from '../../services/NotificationService';
import * as agendaApi from '../../api/agenda.js';
import './Topbar.css';

// ============================================
// CONSTANTS
// ============================================
const PAGE_MAPPINGS = {
  '': 'Início',
  'opcoes': 'Opções',
  'login': 'Login',
  'registo': 'Registo',
  'glicose': 'Glicose',
  'insulina': 'Insulina',
  'agenda': 'Agenda',
  'historico': 'Histórico',
  'estatisticas': 'Estatísticas',
  'perfil': 'Perfil',
};

// ============================================
// NOTIFICATION COMPONENTS
// ============================================
const NotificationPermissionPrompt = ({ onEnable }) => (
  <div className="p-3" style={{ minWidth: '350px' }}>
    <div className="d-flex align-items-center mb-2">
      <i className="fas fa-bell me-2 text-info"></i>
      <strong className="text-info">Ativar notificações</strong>
    </div>
    <p className="text-muted mb-3 small">
      Receba lembretes automáticos das suas medições agendadas.
    </p>
    <Button variant="primary" size="sm" onClick={onEnable}>
      <i className="fas fa-bell me-1"></i>
      Ativar Notificações
    </Button>
  </div>
);

const NotificationDeniedPrompt = () => (
  <div className="p-3" style={{ minWidth: '350px' }}>
    <div className="d-flex align-items-center mb-2">
      <i className="fas fa-bell-slash me-2 text-warning"></i>
      <strong className="text-warning">Notificações desativadas</strong>
    </div>
    <p className="text-muted mb-3 small">
      Ative as notificações nas definições do navegador para receber lembretes das suas medições.
    </p>
    <Button variant="outline-warning" size="sm" onClick={() => window.location.reload()}>
      <i className="fas fa-refresh me-1"></i>
      Tentar novamente
    </Button>
  </div>
);

const EmptyNotifications = () => (
  <div className="p-3" style={{ minWidth: '350px' }}>
    <div className="d-flex align-items-center mb-2">
      <i className="fas fa-bell me-2 text-success"></i>
      <strong className="text-success">Nenhuma notificação</strong>
    </div>
    <p className="text-muted mb-0 small">
      Não há medições pendentes no momento.
    </p>
  </div>
);

const NotificationItem = ({ notification, onDismiss }) => (
  <div className={`p-3 border-bottom notification-item ${notification.urgency}`}>
    <div className="d-flex justify-content-between align-items-start">
      <div className="flex-grow-1">
        <h6 className="mb-1">
          <span className="text-muted small me-2">
            {notification.type === 'G' ? '🩸' : '💉'}
          </span>
          {notification.title}
        </h6>
        <p className="text-muted mb-1 small">
          <i className="fas fa-clock me-1"></i>
          {notification.time}
        </p>
        {notification.notes && (
          <p className="text-muted mb-0 small">
            <i className="fas fa-sticky-note me-1"></i>
            {notification.notes}
          </p>
        )}
      </div>
      <Button
        variant="outline-secondary"
        size="sm"
        onClick={() => onDismiss(notification.id)}
        title="Dispensar"
      >
        <i className="fas fa-times"></i>
      </Button>
    </div>
  </div>
);

const NotificationList = ({ notifications, onDismiss, onViewAgenda }) => (
  <div style={{ minWidth: '350px', maxHeight: '400px', overflowY: 'auto' }}>
    <div className="p-3 border-bottom">
      <div className="d-flex align-items-center justify-content-between">
        <strong>Medições Pendentes</strong>
        <Badge bg="primary">{notifications.length}</Badge>
      </div>
    </div>
    
    {notifications.map((notification) => (
      <NotificationItem
        key={notification.id}
        notification={notification}
        onDismiss={onDismiss}
      />
    ))}
    
    <div className="p-3">
      <Button 
        variant="outline-primary" 
        size="sm" 
        className="w-100"
        onClick={onViewAgenda}
      >
        <i className="fas fa-calendar me-1"></i>
        Ver Agenda Completa
      </Button>
    </div>
  </div>
);

// ============================================
// CUSTOM HOOKS
// ============================================
const useNotifications = (isAuthenticated) => {
  const [pendingNotifications, setPendingNotifications] = useState([]);
  const [marcacoes, setMarcacoes] = useState([]);

  const fetchMarcacoes = async () => {
    if (!isAuthenticated) return;
    
    try {
      const data = await agendaApi.obterMarcacoes();
      setMarcacoes(data);
      
      const pending = NotificationService.getPendingNotifications(data);
      setPendingNotifications(pending);
    } catch (error) {
      console.error('Error fetching marcacoes for notifications:', error);
    }
  };

  useEffect(() => {
    const pending = NotificationService.getPendingNotifications(marcacoes);
    setPendingNotifications(pending);
  }, [marcacoes]);

  useEffect(() => {
    if (!isAuthenticated) return;

    fetchMarcacoes();
    const interval = setInterval(fetchMarcacoes, 60 * 1000);
    
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  useEffect(() => {
    const handleAgendaUpdate = () => fetchMarcacoes();

    window.addEventListener('agendaUpdated', handleAgendaUpdate);
    window.addEventListener('storage', (e) => {
      if (e.key === 'agenda_updated') handleAgendaUpdate();
    });

    return () => {
      window.removeEventListener('agendaUpdated', handleAgendaUpdate);
      window.removeEventListener('storage', handleAgendaUpdate);
    };
  }, []);

  const handleDismissNotification = (marcacaoId) => {
    NotificationService.dismissNotification(marcacaoId);
    setPendingNotifications(prev => prev.filter(n => n.id !== marcacaoId));
  };

  return { pendingNotifications, handleDismissNotification };
};

const useClickOutside = (ref, callback) => {
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        callback();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [ref, callback]);
};

// ============================================
// MAIN COMPONENT
// ============================================
export default function Topbar({ toggleSidebar, sidebarVisible }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isAuthenticated } = useAuth();
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);
  const [permission, setPermission] = useState(Notification.permission);
  const dropdownRef = useRef(null);

  const { pendingNotifications, handleDismissNotification } = useNotifications(isAuthenticated);
  
  useClickOutside(dropdownRef, () => setShowNotificationDropdown(false));

  // ============================================
  // HANDLERS
  // ============================================
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleEnableNotifications = async () => {
    const granted = await NotificationService.requestPermission();
    setPermission(granted ? 'granted' : 'denied');
  };

  const handleViewAgenda = () => {
    setShowNotificationDropdown(false);
    navigate('/agenda');
  };

  // ============================================
  // UTILITIES
  // ============================================
  const getPageName = (path) => PAGE_MAPPINGS[path.substring(1)] || '';

  const getBellColor = () => {
    if (pendingNotifications.length === 0) return '';
    
    const highestPriority = pendingNotifications[0];
    const colorMap = {
      danger: 'text-danger',
      warning: 'text-warning', 
      info: 'text-info'
    };
    return colorMap[highestPriority.urgency] || 'text-success';
  };

  // ============================================
  // NOTIFICATION DROPDOWN CONTENT
  // ============================================
  const NotificationDropdownContent = () => {
    if (permission === 'denied') {
      return <NotificationDeniedPrompt />;
    }

    if (permission === 'default') {
      return <NotificationPermissionPrompt onEnable={handleEnableNotifications} />;
    }

    if (pendingNotifications.length === 0) {
      return <EmptyNotifications />;
    }

    return (
      <NotificationList
        notifications={pendingNotifications}
        onDismiss={handleDismissNotification}
        onViewAgenda={handleViewAgenda}
      />
    );
  };

  // ============================================
  // RENDER
  // ============================================
  return (
    <Navbar variant="dark" className="px-3 topbar fixed-top">
      {/* Hamburger Menu */}
      <Button
        variant="outline-light"
        className={`hamburger-button ${sidebarVisible ? 'sidebar-open' : ''}`}
        onClick={toggleSidebar}
      >
        <FaBars />
      </Button>
      
      {/* Page Name */}
      <div className="page-name-container ms-3">
        {getPageName(location.pathname)}
      </div>

      {/* Right Side Content */}
      <Navbar.Collapse className="justify-content-end align-items-center">
        {user ? (
          <>
            {/* Username */}
            <Navbar.Text className="me-3">
              {user.username || 'User'}
            </Navbar.Text>
            
            {/* Notification Bell */}
            <div className="position-relative me-2" ref={dropdownRef}>
              <Button
                variant="outline-light"
                className="topbar-icon-button position-relative"
                onClick={() => setShowNotificationDropdown(!showNotificationDropdown)}
                title="Notificações pendentes"
              >
                <FaBell className={getBellColor()} />
                
                {pendingNotifications.length > 0 && (
                  <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                    {pendingNotifications.length > 9 ? '9+' : pendingNotifications.length}
                  </span>
                )}
              </Button>

              {showNotificationDropdown && (
                <div
                  className="position-absolute top-100 end-0 mt-2 bg-white border rounded shadow-lg notification-dropdown-content"
                  style={{ 
                    zIndex: 1050,
                    boxShadow: '0 0.5rem 1rem rgba(0, 0, 0, 0.15)'
                  }}
                >
                  <div className="dropdown-arrow position-absolute top-0 end-0 me-3" 
                       style={{
                         marginTop: '-6px',
                         width: 0,
                         height: 0,
                         borderLeft: '6px solid transparent',
                         borderRight: '6px solid transparent',
                         borderBottom: '6px solid #dee2e6'
                       }}>
                  </div>
                  <NotificationDropdownContent />
                </div>
              )}
            </div>
            
            {/* Settings Dropdown */}
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