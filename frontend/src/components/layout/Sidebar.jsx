// Sidebar.jsx
import { Nav } from 'react-bootstrap';
import { NavLink } from 'react-router-dom';
import {
    BiHomeAlt,
    BiDroplet,
    BiInjection,
    BiCalendar,
    BiHistory,
    BiCog,
    BiChart, 
    BiUser
} from 'react-icons/bi';
import './Sidebar.css';

export default function Sidebar({ isVisible }) {
    return (
        <div className={`sidebar-container ${isVisible ? 'show' : 'hide'}`}>
            <div className="sidebar-header">Menu</div>
            <Nav className="flex-column sidebar-nav">
                <Nav.Link as={NavLink} to="/" >
                    <BiHomeAlt className="sidebar-icon" /> Início
                </Nav.Link>
                <Nav.Link as={NavLink} to="/glicose">
                    <BiDroplet className="sidebar-icon" /> Glicose
                </Nav.Link>
                <Nav.Link as={NavLink} to="/insulina">
                    <BiInjection className="sidebar-icon" /> Insulina
                </Nav.Link>
                <Nav.Link as={NavLink} to="/estatisticas"> 
                    <BiChart className="sidebar-icon" /> Estatísticas
                </Nav.Link>
                <Nav.Link as={NavLink} to="/agenda">
                    <BiCalendar className="sidebar-icon" /> Agenda
                </Nav.Link>
                <Nav.Link as={NavLink} to="/historico">
                    <BiHistory className="sidebar-icon" /> Histórico
                </Nav.Link>
                <Nav.Link as={NavLink} to="/perfil">
                    <BiUser className="sidebar-icon" /> Perfil
                </Nav.Link>
                <Nav.Link as={NavLink} to="/opcoes">
                    <BiCog className="sidebar-icon" /> Opções
                </Nav.Link>
            </Nav>
        </div>
    );
}
