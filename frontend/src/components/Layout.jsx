import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/Layout.css';

function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <div className="layout">
      <nav className="sidebar">
        <div className="sidebar-header">
          <h2>Day Trader</h2>
          <p className="user-info">{user?.email}</p>
        </div>

        <div className="nav-links">
          <Link
            to="/dashboard"
            className={`nav-link ${isActive('/dashboard') ? 'active' : ''}`}
          >
            <span className="nav-icon">📊</span>
            Dashboard
          </Link>
          <Link
            to="/algorithms"
            className={`nav-link ${isActive('/algorithms') ? 'active' : ''}`}
          >
            <span className="nav-icon">⚙️</span>
            Algorithms
          </Link>
          <Link
            to="/paper-trading"
            className={`nav-link ${isActive('/paper-trading') ? 'active' : ''}`}
          >
            <span className="nav-icon">💰</span>
            Paper Trading
          </Link>
        </div>

        <div className="sidebar-footer">
          <button onClick={handleLogout} className="btn-logout">
            Logout
          </button>
        </div>
      </nav>

      <main className="main-content">
        {children}
      </main>
    </div>
  );
}

export default Layout;
