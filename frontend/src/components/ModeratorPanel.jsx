import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import UserHoverCard from './UserHoverCard';

export default function ModeratorPanel({ trackId, onUpdate }) {
  const [moderators, setModerators] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [message, setMessage] = useState({ text: '', type: '' });
  const debounceRef = useRef(null);

  const fetchModerators = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/tracks/${trackId}/moderators`);
      setModerators(data.moderators || []);
    } catch {
      setMessage({ text: 'Failed to load moderators.', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [trackId]);

  useEffect(() => {
    fetchModerators();
  }, [fetchModerators]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }
    setHasSearched(false);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const { data } = await api.get(`/users/search?q=${encodeURIComponent(searchQuery.trim())}`);
        const modIds = new Set(moderators.map((m) => m.user_id));
        setSearchResults(data.filter((u) => !modIds.has(u.id)));
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
        setHasSearched(true);
      }
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [searchQuery, moderators]);

  async function handleAdd(userId) {
    setActionLoading(userId);
    setMessage({ text: '', type: '' });
    try {
      await api.post(`/tracks/${trackId}/moderators/${userId}`);
      await fetchModerators();
      onUpdate?.();
      setSearchQuery('');
      setSearchResults([]);
    } catch (err) {
      const detail = err.response?.data?.detail || 'Failed to add moderator.';
      setMessage({ text: detail, type: 'error' });
    } finally {
      setActionLoading(null);
    }
  }

  async function handleRemove(userId) {
    setActionLoading(userId);
    setMessage({ text: '', type: '' });
    try {
      await api.delete(`/tracks/${trackId}/moderators/${userId}`);
      await fetchModerators();
      onUpdate?.();
    } catch (err) {
      const detail = err.response?.data?.detail || 'Failed to remove moderator.';
      setMessage({ text: detail, type: 'error' });
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <details className="mod-panel">
      <summary className="mod-panel-summary">
        Manage Moderators ({loading ? '...' : moderators.length})
      </summary>

      <div className="mod-panel-body">
        {message.text && (
          <div className={`mod-panel-message mod-panel-message-${message.type}`} role="alert">
            {message.text}
          </div>
        )}

        {moderators.length > 0 ? (
          <ul className="mod-list">
            {moderators.map((mod) => (
              <li key={mod.user_id} className="mod-list-item">
                <UserHoverCard userId={mod.user_id}>
                  <Link to={`/users/${mod.user_id}`} className="mod-list-name post-author-link">{mod.display_name}</Link>
                </UserHoverCard>
                <button
                  className="btn-ghost mod-list-remove"
                  onClick={() => handleRemove(mod.user_id)}
                  disabled={actionLoading === mod.user_id}
                >
                  {actionLoading === mod.user_id ? '...' : 'Remove'}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          !loading && <p className="mod-panel-empty">No moderators yet.</p>
        )}

        <div className="mod-search">
          <input
            type="text"
            className="mod-search-input"
            placeholder="Search users to add..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search users"
          />
          {searching && <span className="mod-search-status">Searching...</span>}
          {searchResults.length > 0 && (
            <ul className="mod-search-results">
              {searchResults.map((u) => (
                <li key={u.id} className="mod-search-item">
                  <span>{u.display_name}</span>
                  <button
                    className="btn-accent mod-search-add"
                    onClick={() => handleAdd(u.id)}
                    disabled={actionLoading === u.id}
                  >
                    {actionLoading === u.id ? '...' : 'Add'}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {searchQuery.trim() && !searching && hasSearched && searchResults.length === 0 && (
            <p className="mod-search-empty">No users found.</p>
          )}
        </div>
      </div>
    </details>
  );
}
