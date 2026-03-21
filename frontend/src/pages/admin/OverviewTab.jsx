import { useState, useEffect } from 'react';
import {
  HiUsers,
  HiMusicalNote,
  HiChatBubbleLeftRight,
  HiTrash,
  HiNoSymbol,
  HiShieldCheck,
} from 'react-icons/hi2';
import api from '../../services/api';
import { formatRelativeTime } from '../../utils/time';
import { humanizeAction, ACTION_COLORS } from './utils';

const STAT_CARDS = [
  { key: 'total_users', label: 'Total Users', icon: HiUsers, color: 'cyan' },
  { key: 'total_tracks', label: 'Total Tracks', icon: HiMusicalNote, color: 'emerald' },
  { key: 'total_posts', label: 'Total Comments', icon: HiChatBubbleLeftRight, color: 'amber' },
  { key: 'total_removed_posts', label: 'Removed Comments', icon: HiTrash, color: 'rose' },
  { key: 'banned_users', label: 'Banned Users', icon: HiNoSymbol, color: 'red' },
  { key: 'total_moderators', label: 'Moderators', icon: HiShieldCheck, color: 'emerald' },
];

export default function OverviewTab() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    api.get('/admin/stats')
      .then(({ data }) => { if (!cancelled) setStats(data); })
      .catch(() => { if (!cancelled) setError('Failed to load stats.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (loading) return <div className="admin-loading">Loading stats…</div>;
  if (error) return <div className="admin-empty">{error}</div>;

  return (
    <div>
      <div className="admin-stats-grid">
        {STAT_CARDS.map(({ key, label, icon: Icon, color }) => (
          <div key={key} className="admin-stat-card">
            <div className={`admin-stat-icon admin-stat-icon--${color}`}>
              <Icon size={22} />
            </div>
            <div>
              <div className="admin-stat-value">{stats[key]}</div>
              <div className="admin-stat-label">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {stats.recent_actions?.length > 0 && (
        <div className="admin-recent">
          <h3 className="admin-section-title">Recent Actions</h3>
          {stats.recent_actions.map((entry) => (
            <div key={entry.id} className="admin-recent-item">
              <span
                className="admin-audit-dot"
                style={{ backgroundColor: ACTION_COLORS[entry.action] || '#94A3B8' }}
              />
              <span className="admin-recent-actor">{entry.actor_display_name}</span>
              <span className="admin-recent-action">{humanizeAction(entry.action)}</span>
              <span className="admin-recent-time">{formatRelativeTime(entry.created_at)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
