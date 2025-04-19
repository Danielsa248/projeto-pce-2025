// Topbar.jsx
import { Navbar, Button } from 'react-bootstrap';

export default function Topbar({ toggleSidebar }) {
  return (
    <Navbar bg="primary" variant="dark" className="px-3">
      <Button
        variant="outline-light"
        className="border-0"
        onClick={toggleSidebar}
      >
        ☰
      </Button>
      <Navbar.Collapse className="justify-content-end">
        <Navbar.Text className="me-3">
          USERNAME
        </Navbar.Text>
        <Button variant="outline-light" className="border-0">
          ⚙️
        </Button>
      </Navbar.Collapse>
    </Navbar>
  );
}
