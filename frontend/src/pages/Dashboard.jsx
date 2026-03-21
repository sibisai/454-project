import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  HiMusicalNote,
  HiChatBubbleLeftRight,
  HiShieldCheck,
} from 'react-icons/hi2';
import api from '../services/api';
import { formatRelativeTime } from '../utils/time';
import './Dashboard.css';

const STAT_CARDS = [
  { key: 'tracks_posted', label: 'Tracks Posted', icon: HiMusicalNote, color: 'cyan' },
  { key: 'posts_written', label: 'Comments Written', icon: HiChatBubbleLeftRight, color: 'emerald' },
  { key: 'tracks_moderated', label: 'Tracks Moderated', icon: HiShieldCheck, color: 'amber' },
];

function TrackCard({ track, showDate }) {
  return (
    <Link to={`/tracks/${track.id}`} className="dash-track-card">
      <div className="dash-track-info">
        <span className="dash-track-title">{track.title}</span>
        <span className="dash-track-artist">{track.artist_name}</span>
      </div>
      <div className="dash-track-meta">
        <span>{track.post_count} {track.post_count === 1 ? 'comment' : 'comments'}</span>
        {showDate && <span>{formatRelativeTime(track.created_at)}</span>}
      </div>
    </Link>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    api.get('/users/me/dashboard')
      .then(({ data: d }) => { if (!cancelled) setData(d); })
      .catch(() => { if (!cancelled) setError('Failed to load dashboard.'); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="dash-container">
        <div className="dash-loading">
          <div className="skeleton-line" style={{ width: '30%', height: 28 }} />
          <div className="skeleton-line" style={{ width: '60%', height: 16 }} />
          <div className="skeleton-line" style={{ width: '45%', height: 16 }} />
        </div>
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

  const { stats = {}, my_tracks = [], moderated_tracks = [], recent_activity = [] } = data || {};

  return (
    <div className="dash-container">
      <div className="dash-header">
        <h1>Dashboard</h1>
      </div>

      <div className="dash-stats-grid">
        {STAT_CARDS.map(({ key, label, icon: Icon, color }) => (
          <div key={key} className="dash-stat-card">
            <div className={`dash-stat-icon dash-stat-icon--${color}`}>
              <Icon size={22} />
            </div>
            <div>
              <div className="dash-stat-value">{stats[key] ?? 0}</div>
              <div className="dash-stat-label">{label}</div>
            </div>
          </div>
        ))}
      </div>

      <section className="dash-section">
        <h2 className="dash-section-title">My Tracks</h2>
        {my_tracks.length === 0 ? (
          <div className="dash-empty">
            <HiMusicalNote size={36} className="dash-empty-icon" />
            <p>You haven't posted any tracks yet.</p>
            <Link to="/tracks/new" className="btn-accent">Post your first track</Link>
          </div>
        ) : (
          <div className="dash-track-list">
            {my_tracks.map((t) => <TrackCard key={t.id} track={t} showDate />)}
          </div>
        )}
      </section>

      {moderated_tracks.length > 0 && (
        <section className="dash-section">
          <h2 className="dash-section-title">Tracks I Moderate</h2>
          <div className="dash-track-list">
            {moderated_tracks.map((t) => <TrackCard key={t.id} track={t} />)}
          </div>
        </section>
      )}

      <section className="dash-section">
        <h2 className="dash-section-title">Recent Activity</h2>
        {recent_activity.length === 0 ? (
          <div className="dash-empty">
            <HiChatBubbleLeftRight size={36} className="dash-empty-icon" />
            <p>No activity yet. Join a discussion!</p>
          </div>
        ) : (
          <div className="dash-comment-list">
            {recent_activity.map((c) => (
              <Link key={c.id} to={`/tracks/${c.track_id}`} className="dash-comment-card">
                <div className="dash-comment-context">
                  <HiMusicalNote size={14} />
                  <span>{c.track_title}</span>
                </div>
                <p className="dash-comment-content">{c.content}</p>
                <div className="dash-comment-footer">
                  {c.score !== 0 && (
                    <span className="dash-comment-score">
                      {c.score > 0 ? `+${c.score}` : c.score}
                    </span>
                  )}
                  <span className="dash-comment-time">{formatRelativeTime(c.created_at)}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
