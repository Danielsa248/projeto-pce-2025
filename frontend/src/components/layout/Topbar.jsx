// Topbar.jsx
import './Topbar.css';

export default function Topbar({ toggleSidebar }) {
  return (
    <header className="topbar">
      <div className="left-section">
        <button className="hamburger-btn" onClick={toggleSidebar}>☰</button>
      </div>
      <div className="right-section">
        <span className="username">USERNAME</span>
        <button className="settings-btn">⚙️</button>
      </div>
    </header>
  );
}
