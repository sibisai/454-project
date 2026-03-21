import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { HiMagnifyingGlass } from 'react-icons/hi2';
import api from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { formatRelativeTime } from '../../utils/time';

const PER_PAGE = 20;

export default function UsersTab() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [bannedFilter, setBannedFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchUsers = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    const params = { page, per_page: PER_PAGE };
    if (debouncedSearch) params.search = debouncedSearch;
    if (roleFilter) params.role = roleFilter;
    if (bannedFilter) params.banned = bannedFilter === 'true';

    api.get('/admin/users', { params })
      .then(({ data }) => {
        if (cancelled) return;
        setUsers(data.users);
        setTotal(data.total);
      })
      .catch(() => {
        if (cancelled) return;
        setError('Failed to load users.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [page, debouncedSearch, roleFilter, bannedFilter]);

  useEffect(() => fetchUsers(), [fetchUsers]);

  useEffect(() => { setPage(1); }, [roleFilter, bannedFilter]);

  async function handleUserAction(userId, apiCall, successMsg, errorMsg) {
    setActionLoading(userId);
    setConfirmAction(null);
    setError('');
    try {
      const { data } = await apiCall();
      setUsers((prev) => prev.map((u) => (u.id === userId ? data : u)));
      setSuccessMessage(successMsg);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || errorMsg);
    } finally {
      setActionLoading(null);
    }
  }

  const handleRoleChange = (userId, newRole) =>
    handleUserAction(userId, () => api.put(`/admin/users/${userId}/role`, { role: newRole }), `Role changed to ${newRole}`, 'Failed to change role.');

  const handleBan = (userId) =>
    handleUserAction(userId, () => api.post(`/admin/users/${userId}/ban`), 'User banned', 'Failed to ban user.');

  const handleUnban = (userId) =>
    handleUserAction(userId, () => api.delete(`/admin/users/${userId}/ban`), 'User unbanned', 'Failed to unban user.');

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <div>
      {successMessage && (
        <div className="admin-success-banner" role="status">{successMessage}</div>
      )}
      {error && (
        <div className="error-banner" role="alert">{error}</div>
      )}

      <div className="admin-users-toolbar">
        <div className="search-wrapper">
          <HiMagnifyingGlass size={18} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search users…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search users"
          />
        </div>
        <select
          className="admin-select"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          aria-label="Filter by role"
        >
          <option value="">All Roles</option>
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>
        <select
          className="admin-select"
          value={bannedFilter}
          onChange={(e) => setBannedFilter(e.target.value)}
          aria-label="Filter by banned status"
        >
          <option value="">All Status</option>
          <option value="false">Active</option>
          <option value="true">Banned</option>
        </select>
      </div>

      {loading ? (
        <div className="admin-loading">Loading users…</div>
      ) : users.length === 0 ? (
        <div className="admin-empty">No users found.</div>
      ) : (
        <>
          <div className="admin-user-list">
            {users.map((u) => {
              const isSelf = u.id === currentUser?.id;
              const isConfirming = confirmAction?.userId === u.id;

              return (
                <div key={u.id} className="admin-user-row">
                  <div className="admin-user-info">
                    <Link to={`/users/${u.id}`} className="admin-user-name post-author-link">{u.display_name}</Link>
                    <span className="admin-user-email">{u.email}</span>
                  </div>

                  <div className="admin-user-meta">
                    <span className={`badge badge-${u.global_role}`}>{u.global_role}</span>
                    {u.is_banned && <span className="badge badge-banned">banned</span>}
                  </div>

                  <div className="admin-user-counts">
                    <span>{u.track_count} tracks</span>
                    <span>{u.post_count} comments</span>
                    <span className="admin-user-joined">{formatRelativeTime(u.created_at)}</span>
                  </div>

                  <div className="admin-user-actions">
                    {isConfirming ? (
                      <div className="admin-confirm-inline">
                        <span className="admin-confirm-text">{confirmAction.message}</span>
                        <button
                          className="btn-accent admin-btn-sm"
                          onClick={confirmAction.onConfirm}
                          disabled={actionLoading === u.id}
                        >
                          Confirm
                        </button>
                        <button
                          className="btn-ghost admin-btn-sm"
                          onClick={() => setConfirmAction(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        <select
                          className="admin-select admin-select-sm"
                          value={u.global_role}
                          disabled={isSelf || actionLoading === u.id}
                          title={isSelf ? 'Cannot change own role' : ''}
                          onChange={(e) => {
                            const newRole = e.target.value;
                            if (newRole === u.global_role) return;
                            setConfirmAction({
                              userId: u.id,
                              message: `Change role to ${newRole}?`,
                              onConfirm: () => handleRoleChange(u.id, newRole),
                            });
                          }}
                        >
                          <option value="user">user</option>
                          <option value="admin">admin</option>
                        </select>

                        {u.is_banned ? (
                          <button
                            className="btn-ghost admin-btn-unban admin-btn-sm"
                            disabled={actionLoading === u.id}
                            onClick={() =>
                              setConfirmAction({
                                userId: u.id,
                                message: 'Unban this user?',
                                onConfirm: () => handleUnban(u.id),
                              })
                            }
                          >
                            Unban
                          </button>
                        ) : (
                          <button
                            className="admin-btn-ban admin-btn-sm"
                            disabled={isSelf || u.global_role === 'admin' || actionLoading === u.id}
                            title={
                              isSelf
                                ? 'Cannot ban yourself'
                                : u.global_role === 'admin'
                                  ? 'Demote to user first'
                                  : ''
                            }
                            onClick={() =>
                              setConfirmAction({
                                userId: u.id,
                                message: `Ban ${u.display_name}?`,
                                onConfirm: () => handleBan(u.id),
                              })
                            }
                          >
                            Ban
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
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
