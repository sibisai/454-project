import { Routes, Route, Link } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import './pages/auth.css';

function Placeholder({ label }) {
  return <div className="error-page"><p className="error-message">{label}</p></div>;
}

function NotFound() {
  return (
    <div className="error-page">
      <h1 className="error-code">404</h1>
      <p className="error-message">Page Not Found</p>
      <p className="error-description">The page you're looking for doesn't exist.</p>
      <Link to="/" className="error-link">Back to Home</Link>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Navbar />
      <main style={{ paddingTop: '60px' }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/tracks/new" element={<ProtectedRoute><Placeholder label="Submit Track" /></ProtectedRoute>} />
          <Route path="/tracks/:id" element={<Placeholder label="Track Detail" />} />
          <Route path="/dashboard" element={<ProtectedRoute><Placeholder label="Dashboard" /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute roles={['admin']}><Placeholder label="Admin Panel" /></ProtectedRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </AuthProvider>
  );
}
