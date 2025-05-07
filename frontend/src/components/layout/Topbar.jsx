// Topbar.jsx
import { Navbar, Button, Dropdown } from 'react-bootstrap';
import { Link } from 'react-router-dom';

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
        <Dropdown align="end">
          <Dropdown.Toggle variant="outline-light" className="border-0" id="settings-dropdown">
            ⚙️
          </Dropdown.Toggle>
          <Dropdown.Menu>
            <Dropdown.Item as={Link} to="/login">Login</Dropdown.Item>
            <Dropdown.Item as={Link} to="/register">Register</Dropdown.Item>
            <Dropdown.Divider />
            <Dropdown.Item as={Link} to="/settings">Settings</Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown>
      </Navbar.Collapse>
    </Navbar>
  );
}
