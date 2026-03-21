import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import { formatRelativeTime } from '../utils/time';
import './Discover.css';

function RankItem({ track, rank }) {
  return (
    <Link to={`/tracks/${track.id}`} className="disc-rank-item" role="listitem">
      <span className={`disc-rank-num${rank <= 3 ? ` top-${rank}` : ''}`}>
        {rank}
      </span>
      <div
        className="disc-rank-art"
        style={track.artwork_url ? { backgroundImage: `url(${track.artwork_url})` } : undefined}
      />
      <div className="disc-rank-info">
        <span className="disc-rank-title">{track.title}</span>
        <span className="disc-rank-artist">{track.artist_name}</span>
      </div>
      <span className="disc-rank-posts">
        {track.post_count} {track.post_count === 1 ? 'comment' : 'comments'}
      </span>
    </Link>
  );
}

function ScrollCard({ track, timeLabel }) {
  return (
    <Link to={`/tracks/${track.id}`} className="disc-card" role="listitem">
      <div
        className="disc-card-art"
        style={track.artwork_url ? { backgroundImage: `url(${track.artwork_url})` } : undefined}
      />
      <div className="disc-card-body">
        <span className="disc-card-title">{track.title}</span>
        <span className="disc-card-artist">{track.artist_name}</span>
        {timeLabel && <span className="disc-card-time">{timeLabel}</span>}
      </div>
    </Link>
  );
}

export default function Discover() {
  const { isAuthenticated } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    api.get('/discover')
      .then(({ data: d }) => { if (!cancelled) setData(d); })
      .catch(() => { if (!cancelled) setError('Failed to load discover page.'); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="disc-container">
        <div className="skeleton-line" style={{ width: '40%', height: 32, marginBottom: 8 }} />
        <div className="skeleton-line" style={{ width: '55%', height: 16, marginBottom: 32 }} />
        <div className="disc-hero-card" style={{ pointerEvents: 'none' }}>
          <div className="disc-hero-art skeleton-pulse" />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div className="skeleton-line" style={{ width: '20%', height: 24 }} />
            <div className="skeleton-line" style={{ width: '70%', height: 18 }} />
            <div className="skeleton-line" style={{ width: '40%', height: 14 }} />
          </div>
        </div>
        {[1, 2, 3].map(i => (
          <div key={i} className="skeleton-line" style={{ width: '100%', height: 48, marginBottom: 8 }} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-page">
        <p className="error-message">{error}</p>
        <Link to="/" className="error-link">Back to Home</Link>
      </div>
    );
  }

  const {
    trending = [],
    recently_active = [],
    new_arrivals = [],
    recommended = [],
  } = data;
  const topTrack = trending[0];

  return (
    <div className="disc-container">
      <div className="disc-header">
        <h1>Discover</h1>
        <p className="disc-subtitle">Explore trending tracks and find new music</p>
      </div>

      {topTrack && (
        <section className="disc-section">
          <h2 className="disc-section-title">Trending</h2>
          <Link to={`/tracks/${topTrack.id}`} className="disc-hero-card">
            <div
              className="disc-hero-art"
              style={topTrack.artwork_url ? { backgroundImage: `url(${topTrack.artwork_url})` } : undefined}
            />
            <div className="disc-hero-info">
              <span className="disc-hero-rank">1</span>
              <span className="disc-hero-title">{topTrack.title}</span>
              <span className="disc-hero-artist">{topTrack.artist_name}</span>
            </div>
            <span className="disc-rank-posts">
              {topTrack.post_count} {topTrack.post_count === 1 ? 'comment' : 'comments'}
            </span>
          </Link>
          {trending.length > 1 && (
            <div className="disc-rank-list" role="list" aria-label="Trending tracks">
              {trending.slice(1).map((t, i) => (
                <RankItem key={t.id} track={t} rank={i + 2} />
              ))}
            </div>
          )}
        </section>
      )}

      {recently_active.length > 0 && (
        <section className="disc-section">
          <h2 className="disc-section-title">Recently Active</h2>
          <div className="disc-scroll-row" role="list" aria-label="Recently active tracks">
            {recently_active.map((t) => (
              <ScrollCard
                key={t.id}
                track={t}
                timeLabel={t.last_activity ? `Active ${formatRelativeTime(t.last_activity)}` : null}
              />
            ))}
          </div>
        </section>
      )}

      {new_arrivals.length > 0 && (
        <section className="disc-section">
          <h2 className="disc-section-title">New Arrivals</h2>
          <div className="disc-grid" role="list" aria-label="New arrival tracks">
            {new_arrivals.map((t) => (
              <Link key={t.id} to={`/tracks/${t.id}`} className="disc-grid-card" role="listitem">
                <div
                  className="disc-grid-art"
                  style={t.artwork_url ? { backgroundImage: `url(${t.artwork_url})` } : undefined}
                />
                <div className="disc-grid-info">
                  <span className="disc-card-title">{t.title}</span>
                  <span className="disc-card-artist">{t.artist_name}</span>
                  {t.created_at && <span className="disc-card-time">Posted {formatRelativeTime(t.created_at)}</span>}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="disc-section">
        <h2 className="disc-section-title">Recommended For You</h2>
        {!isAuthenticated ? (
          <div className="disc-rec-prompt">
            <p>Sign in to get personalized recommendations</p>
            <Link to="/login" className="btn-accent disc-rec-login">
              Login
            </Link>
          </div>
        ) : recommended.length === 0 ? (
          <div className="disc-rec-prompt">
            <p>Like some tracks to unlock personalized picks</p>
          </div>
        ) : (
          <div className="disc-scroll-row" role="list" aria-label="Recommended tracks">
            {recommended.map((t) => (
              <ScrollCard key={t.id} track={t} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
