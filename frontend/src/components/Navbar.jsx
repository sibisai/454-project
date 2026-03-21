import { Link, useLocation, useNavigate } from 'react-router-dom';
import { HiMusicalNote } from 'react-icons/hi2';
import { HiOutlineLogout } from 'react-icons/hi';
import { useAuth } from '../hooks/useAuth';
import './Navbar.css';

export default function Navbar() {
  const { user, isAuthenticated, restoring, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  function isActive(path) {
    return location.pathname === path ? 'navbar-link active' : 'navbar-link';
  }

  function handleLogout() {
    logout();
    navigate('/');
  }

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <Link to="/" className="navbar-brand">
          <HiMusicalNote size={24} />
          SoundBoard
        </Link>
        <ul className="navbar-links">
          <li><Link to="/" className={isActive('/')}>Home</Link></li>
          {isAuthenticated && (
            <li><Link to="/dashboard" className={isActive('/dashboard')}>Dashboard</Link></li>
          )}
          {user?.global_role === 'admin' && (
            <li><Link to="/admin" className={isActive('/admin')}>Admin Panel</Link></li>
          )}
        </ul>
      </div>

      <div className="navbar-right">
        {restoring ? null : isAuthenticated ? (
          <div className="navbar-user">
            <span className={`badge badge-${user.global_role}`}>
              {user.global_role}
            </span>
            <Link to={`/users/${user.id}`} className="navbar-display-name">{user.display_name}</Link>
            <button
              className="btn-logout"
              onClick={handleLogout}
              aria-label="Logout"
              title="Logout"
            >
              <HiOutlineLogout size={20} />
            </button>
          </div>
        ) : (
          <>
            <Link to="/login" className="btn-ghost">Login</Link>
            <Link to="/register" className="btn-accent">Register</Link>
          </>
        )}
      </div>
    </nav>
  );
}
