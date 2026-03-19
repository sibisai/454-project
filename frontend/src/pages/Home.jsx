import { Link } from 'react-router-dom';
import { HiMusicalNote } from 'react-icons/hi2';

export default function Home() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 'calc(100dvh - 60px)',
      gap: 'var(--space-4)',
      padding: 'var(--space-4)',
    }}>
      <HiMusicalNote size={48} color="var(--color-primary)" />
      <h1 style={{ fontSize: 'var(--font-3xl)', fontWeight: 700 }}>SoundBoard</h1>
      <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-lg)', textAlign: 'center' }}>
        Share SoundCloud tracks and discuss music with the community.
      </p>
      <Link to="/register" className="btn-accent" style={{ padding: 'var(--space-3) var(--space-6)', marginTop: 'var(--space-4)' }}>
        Get Started
      </Link>
    </div>
  );
}
