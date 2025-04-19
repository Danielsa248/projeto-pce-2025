// Layout.jsx
import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Container, Row, Col } from 'react-bootstrap';
import Topbar from './Topbar';
import Sidebar from './Sidebar';
import './Layout.css';

export default function Layout() {
  const [sidebarVisivel, setSidebarVisivel] = useState(false);

  const toggleSidebar = () => {
    setSidebarVisivel(!sidebarVisivel);
  };

  return (
    <div className="vh-100 d-flex flex-column">
      <Topbar toggleSidebar={toggleSidebar} />
      <Container fluid className="flex-grow-1 p-0">
        <Row className="h-100 m-0">
          <Sidebar isVisible={sidebarVisivel} />
          <Col 
            className="p-3 content-transition"
            style={{
              marginLeft: sidebarVisivel ? '240px' : '0',
              width: 'calc(100% - ${sidebarVisivel ? "240px" : "0px"})',
              transition: 'margin-left 0.3s ease, width 0.3s ease'
            }}
          >
            <Outlet />
          </Col>
        </Row>
      </Container>
    </div>
  );
}
