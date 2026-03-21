import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import Skeleton from '../../components/Skeleton';

const LIMIT_OPTIONS = [5, 10, 25];

export default function TopTracksTab() {
  const [limit, setLimit] = useState(10);
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    api.get('/admin/top-tracks', { params: { limit } })
      .then(({ data }) => { if (!cancelled) setTracks(data); })
      .catch(() => { if (!cancelled) setError('Failed to load top tracks.'); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [limit]);

  return (
    <div>
      <div className="admin-tabs-inline" role="tablist" aria-label="Limit">
        {LIMIT_OPTIONS.map((l) => (
          <button
            key={l}
            role="tab"
            aria-selected={limit === l}
            className={`sort-tab${limit === l ? ' active' : ''}`}
            onClick={() => setLimit(l)}
          >
            Top {l}
          </button>
        ))}
      </div>

      {error && <div className="error-banner" role="alert">{error}</div>}

      {loading ? (
        <div className="admin-leaderboard">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="admin-leaderboard-row">
              <Skeleton width={40} height={24} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                <Skeleton width="60%" height={14} />
                <Skeleton width="30%" height={12} />
              </div>
              <Skeleton width={120} height={14} />
            </div>
          ))}
        </div>
      ) : tracks.length === 0 ? (
        <div className="admin-empty">No tracks with discussions yet.</div>
      ) : (
        <div className="admin-leaderboard">
          {tracks.map((t, i) => (
            <div key={t.track_id} className="admin-leaderboard-row">
              <span className="admin-leaderboard-rank">#{i + 1}</span>
              <div className="admin-leaderboard-info">
                <Link to={`/tracks/${t.track_id}`} className="admin-leaderboard-title">
                  {t.title}
                </Link>
                <span className="admin-leaderboard-artist">{t.artist_name}</span>
              </div>
              <div className="admin-leaderboard-stats">
                <span>{t.post_count} comments</span>
                <span>{t.unique_commenters} commenters</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
