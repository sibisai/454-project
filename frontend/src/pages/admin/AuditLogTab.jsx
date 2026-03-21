import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { formatRelativeTime } from '../../utils/time';
import { humanizeAction, ACTION_COLORS, ALL_ACTIONS } from './utils';

const PER_PAGE = 20;

export default function AuditLogTab() {
  const [entries, setEntries] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchLog = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    const params = { page, per_page: PER_PAGE };
    if (actionFilter) params.action = actionFilter;
    if (roleFilter) params.actor_role = roleFilter;
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;

    api.get('/admin/audit-log', { params })
      .then(({ data }) => {
        if (cancelled) return;
        setEntries(data.entries);
        setTotal(data.total);
      })
      .catch(() => {
        if (cancelled) return;
        setError('Failed to load audit log.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [page, actionFilter, roleFilter, dateFrom, dateTo]);

  useEffect(() => fetchLog(), [fetchLog]);

  useEffect(() => { setPage(1); }, [actionFilter, roleFilter, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <div>
      <div className="admin-audit-toolbar">
        <select
          className="admin-select"
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          aria-label="Filter by action"
        >
          <option value="">All Actions</option>
          {ALL_ACTIONS.map((a) => (
            <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>
          ))}
        </select>
        <select
          className="admin-select"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          aria-label="Filter by role"
        >
          <option value="">All Roles</option>
          <option value="admin">Admin</option>
          <option value="user">User</option>
        </select>
        <input
          type="date"
          className="admin-date-input"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          aria-label="From date"
        />
        <input
          type="date"
          className="admin-date-input"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          aria-label="To date"
        />
      </div>

      {error && <div className="error-banner" role="alert">{error}</div>}

      {loading ? (
        <div className="admin-loading">Loading audit log…</div>
      ) : entries.length === 0 ? (
        <div className="admin-empty">No audit log entries found.</div>
      ) : (
        <>
          <div className="admin-audit-feed">
            {entries.map((entry) => (
              <div key={entry.id} className="admin-audit-entry">
                <span
                  className="admin-audit-dot"
                  style={{ backgroundColor: ACTION_COLORS[entry.action] || '#94A3B8' }}
                />
                <div className="admin-audit-body">
                  <span className="admin-audit-actor">{entry.actor_display_name}</span>
                  {' '}
                  <span className="admin-audit-action">{humanizeAction(entry.action)}</span>
                </div>
                <span className="admin-audit-time">{formatRelativeTime(entry.created_at)}</span>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button
                className="btn-ghost"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </button>
              <span className="pagination-info">
                Page {page} of {totalPages}
              </span>
              <button
                className="btn-ghost"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
