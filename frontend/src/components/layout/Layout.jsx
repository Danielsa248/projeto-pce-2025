// Layout.jsx
import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Topbar from './Topbar';
import Sidebar from './Sidebar';
import './Layout.css';

export default function Layout() {
  const [sidebarVisivel, setSidebarVisivel] = useState(false);

  const toggleSidebar = () => {
    setSidebarVisivel(!sidebarVisivel);
  };

  return (
    <div className="app-container">
      <Topbar toggleSidebar={toggleSidebar} sidebarVisible={sidebarVisivel} />
      <Sidebar isVisible={sidebarVisivel} />

      <div
        className="main-content"
        style={{
          marginLeft: sidebarVisivel ? '250px' : '0',
          transition: 'margin-left 0.3s ease'
        }}
      >
        <Outlet />
      </div>
      
    </div>
  );
}
