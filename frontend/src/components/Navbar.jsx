import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { HiMusicalNote, HiBars3, HiXMark } from 'react-icons/hi2';
import { HiOutlineLogout } from 'react-icons/hi';
import { useAuth } from '../hooks/useAuth';
import UserHoverCard from './UserHoverCard';
import './Navbar.css';

export default function Navbar() {
  const { user, isAuthenticated, restoring, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

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
          <li><Link to="/discover" className={isActive('/discover')}>Discover</Link></li>
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
            <UserHoverCard userId={user.id}>
              <Link to={`/users/${user.id}`} className="navbar-display-name">{user.display_name}</Link>
            </UserHoverCard>
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

      <button
        className="navbar-hamburger"
        onClick={() => setMenuOpen((o) => !o)}
        aria-expanded={menuOpen}
        aria-label="Navigation menu"
      >
        {menuOpen ? <HiXMark size={24} /> : <HiBars3 size={24} />}
      </button>

      <div className={`navbar-mobile-menu${menuOpen ? ' open' : ''}`}>
        <Link to="/" className={isActive('/')}>Home</Link>
        <Link to="/discover" className={isActive('/discover')}>Discover</Link>
        {isAuthenticated && (
          <Link to="/dashboard" className={isActive('/dashboard')}>Dashboard</Link>
        )}
        {user?.global_role === 'admin' && (
          <Link to="/admin" className={isActive('/admin')}>Admin Panel</Link>
        )}
        <div className="navbar-mobile-divider" />
        {restoring ? null : isAuthenticated ? (
          <>
            <Link to={`/users/${user.id}`} className="navbar-link">Profile</Link>
            <button className="navbar-mobile-logout" onClick={handleLogout}>
              <HiOutlineLogout size={18} />
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="navbar-link">Login</Link>
            <Link to="/register" className="navbar-link">Register</Link>
          </>
        )}
      </div>
    </nav>
  );
}
