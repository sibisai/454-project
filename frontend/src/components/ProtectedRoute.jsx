import { Navigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function ProtectedRoute({ roles, children }) {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles && !roles.includes(user.global_role)) {
    return (
      <div className="error-page">
        <h1 className="error-code">403</h1>
        <p className="error-message">Access Denied</p>
        <p className="error-description">You don't have permission to view this page.</p>
        <Link to="/" className="error-link">Back to Home</Link>
      </div>
    );
  }

  return children;
}
