import { Routes, Route, Link } from 'react-router-dom';
import { HiMusicalNote } from 'react-icons/hi2';
import { AuthProvider } from './hooks/useAuth';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import TrackSubmit from './pages/TrackSubmit';
import TrackDetail from './pages/TrackDetail';
import AdminPanel from './pages/AdminPanel';
import UserProfile from './pages/UserProfile';
import Dashboard from './pages/Dashboard';
import Discover from './pages/Discover';
import './pages/auth.css';

function NotFound() {
  return (
    <div className="error-page">
      <HiMusicalNote size={64} className="error-page-icon" />
      <h1 className="error-code error-code-gradient">404</h1>
      <p className="error-message">Page Not Found</p>
      <p className="error-description">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link to="/" className="error-link">Back to Home</Link>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Navbar />
      <main style={{ paddingTop: '48px' }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/discover" element={<Discover />} />
          <Route path="/tracks/new" element={<ProtectedRoute><TrackSubmit /></ProtectedRoute>} />
          <Route path="/tracks/:id" element={<TrackDetail />} />
          <Route path="/users/:id" element={<UserProfile />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AdminPanel /></ProtectedRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </AuthProvider>
  );
}
