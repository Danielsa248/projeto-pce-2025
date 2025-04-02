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
      <Topbar toggleSidebar={toggleSidebar} />
      <div className="content-container">
        <Sidebar isVisible={sidebarVisivel} />
        <main className={`main-content ${sidebarVisivel ? 'sidebar-open' : 'sidebar-closed'}`}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
