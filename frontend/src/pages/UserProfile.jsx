import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  HiMusicalNote,
  HiChatBubbleLeftRight,
  HiCalendarDays,
  HiEnvelope,
  HiNoSymbol,
  HiShieldCheck,
  HiUserCircle,
} from 'react-icons/hi2';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import { formatRelativeTime } from '../utils/time';
import './UserProfile.css';

const TABS = [
  { id: 'tracks', label: 'Tracks', icon: HiMusicalNote },
  { id: 'comments', label: 'Comments', icon: HiChatBubbleLeftRight },
];

const PER_PAGE = 20;

export default function UserProfile() {
  const { id } = useParams();
  const { user: currentUser } = useAuth();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');

  const [activeTab, setActiveTab] = useState('tracks');

  const [tracks, setTracks] = useState([]);
  const [tracksTotal, setTracksTotal] = useState(0);
  const [tracksPage, setTracksPage] = useState(1);
  const [tracksLoading, setTracksLoading] = useState(false);

  const [comments, setComments] = useState([]);
  const [commentsTotal, setCommentsTotal] = useState(0);
  const [commentsPage, setCommentsPage] = useState(1);
  const [commentsLoading, setCommentsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setPageError('');
    setProfile(null);
    setActiveTab('tracks');
    setTracksPage(1);
    setCommentsPage(1);

    api.get(`/users/${id}`)
      .then(({ data }) => { if (!cancelled) setProfile(data); })
      .catch((err) => {
        if (!cancelled) {
          setPageError(err.response?.status === 404 ? 'not_found' : 'Failed to load profile.');
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [id]);

  const fetchTracks = useCallback(() => {
    let cancelled = false;
    setTracksLoading(true);

    api.get(`/users/${id}/tracks`, { params: { page: tracksPage, per_page: PER_PAGE } })
      .then(({ data }) => {
        if (cancelled) return;
        setTracks(data.tracks);
        setTracksTotal(data.total);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setTracksLoading(false); });

    return () => { cancelled = true; };
  }, [id, tracksPage]);

  const fetchComments = useCallback(() => {
    let cancelled = false;
    setCommentsLoading(true);

    api.get(`/users/${id}/posts`, { params: { page: commentsPage, per_page: PER_PAGE } })
      .then(({ data }) => {
        if (cancelled) return;
        setComments(data.posts);
        setCommentsTotal(data.total);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setCommentsLoading(false); });

    return () => { cancelled = true; };
  }, [id, commentsPage]);

  useEffect(() => {
    if (profile && activeTab === 'tracks') fetchTracks();
  }, [profile, activeTab, fetchTracks]);

  useEffect(() => {
    if (profile && activeTab === 'comments') fetchComments();
  }, [profile, activeTab, fetchComments]);

  if (loading) {
    return (
      <div className="profile-container">
        <div className="profile-header-skeleton">
          <div className="skeleton-line" style={{ width: '40%', height: 28 }} />
          <div className="skeleton-line" style={{ width: '25%', height: 16 }} />
        </div>
      </div>
    );
  }

  if (pageError === 'not_found') {
    return (
      <div className="error-page">
        <h1 className="error-code">404</h1>
        <p className="error-message">User Not Found</p>
        <p className="error-description">This user doesn't exist or has been removed.</p>
        <Link to="/" className="error-link">Back to Home</Link>
      </div>
    );
  }

  if (pageError) {
    return (
      <div className="error-page">
        <p className="error-message">{pageError}</p>
        <Link to="/" className="error-link">Back to Home</Link>
      </div>
    );
  }

  const isSelf = currentUser?.id === profile.id;
  const isAdmin = currentUser?.global_role === 'admin';
  const tracksTotalPages = Math.max(1, Math.ceil(tracksTotal / PER_PAGE));
  const commentsTotalPages = Math.max(1, Math.ceil(commentsTotal / PER_PAGE));

  return (
    <div className="profile-container">
      <header className="profile-header">
        <div className="profile-header-top">
          <div className="profile-avatar">
            <HiUserCircle size={56} />
          </div>
          <div className="profile-identity">
            <div className="profile-name-row">
              <h1 className="profile-name">{profile.display_name}</h1>
              {profile.global_role && profile.global_role !== 'user' && (
                <span className={`badge badge-${profile.global_role}`}>{profile.global_role}</span>
              )}
              {isSelf && <span className="profile-self-badge">You</span>}
            </div>
            <div className="profile-meta">
              <span className="profile-meta-item">
                <HiCalendarDays size={14} />
                Joined {formatRelativeTime(profile.created_at)}
              </span>
              {profile.email && (
                <span className="profile-meta-item">
                  <HiEnvelope size={14} />
                  {profile.email}
                </span>
              )}
              {isAdmin && profile.is_banned && (
                <span className="profile-meta-item profile-meta-banned">
                  <HiNoSymbol size={14} />
                  Banned
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="profile-stats">
          <div className="profile-stat">
            <HiMusicalNote size={16} className="profile-stat-icon" />
            <span className="profile-stat-value">{profile.track_count}</span>
            <span className="profile-stat-label">tracks</span>
          </div>
          <div className="profile-stat">
            <HiChatBubbleLeftRight size={16} className="profile-stat-icon" />
            <span className="profile-stat-value">{profile.post_count}</span>
            <span className="profile-stat-label">comments</span>
          </div>
        </div>

        {isSelf && (
          <Link to="/dashboard" className="btn-ghost profile-dashboard-link">
            <HiShieldCheck size={16} />
            Go to Dashboard
          </Link>
        )}
      </header>

      <div className="profile-tabs" role="tablist" aria-label="Profile sections">
        {TABS.map(({ id: tabId, label, icon: Icon }) => (
          <button
            key={tabId}
            role="tab"
            aria-selected={activeTab === tabId}
            className={`sort-tab profile-tab${activeTab === tabId ? ' active' : ''}`}
            onClick={() => setActiveTab(tabId)}
          >
            <Icon size={16} />
            {label}
            <span className="profile-tab-count">
              {tabId === 'tracks' ? profile.track_count : profile.post_count}
            </span>
          </button>
        ))}
      </div>

      <div className="profile-tab-content" role="tabpanel">
        {activeTab === 'tracks' && (
          tracksLoading ? (
            <div className="profile-loading">Loading tracks…</div>
          ) : tracks.length === 0 ? (
            <div className="profile-empty">
              <HiMusicalNote size={36} className="profile-empty-icon" />
              <p>No tracks posted yet.</p>
            </div>
          ) : (
            <>
              <div className="profile-track-list">
                {tracks.map((t) => (
                  <Link key={t.id} to={`/tracks/${t.id}`} className="profile-track-card">
                    <div className="profile-track-info">
                      <span className="profile-track-title">{t.title}</span>
                      <span className="profile-track-artist">{t.artist_name}</span>
                    </div>
                    <div className="profile-track-meta">
                      <span>{t.post_count} {t.post_count === 1 ? 'comment' : 'comments'}</span>
                      <span>{formatRelativeTime(t.created_at)}</span>
                    </div>
                  </Link>
                ))}
              </div>
              {tracksTotalPages > 1 && (
                <div className="pagination">
                  <button className="btn-ghost" disabled={tracksPage <= 1} onClick={() => setTracksPage((p) => p - 1)}>Previous</button>
                  <span className="pagination-info">Page {tracksPage} of {tracksTotalPages}</span>
                  <button className="btn-ghost" disabled={tracksPage >= tracksTotalPages} onClick={() => setTracksPage((p) => p + 1)}>Next</button>
                </div>
              )}
            </>
          )
        )}

        {activeTab === 'comments' && (
          commentsLoading ? (
            <div className="profile-loading">Loading comments…</div>
          ) : comments.length === 0 ? (
            <div className="profile-empty">
              <HiChatBubbleLeftRight size={36} className="profile-empty-icon" />
              <p>No comments yet.</p>
            </div>
          ) : (
            <>
              <div className="profile-comment-list">
                {comments.map((c) => (
                  <Link key={c.id} to={`/tracks/${c.track_id}`} className="profile-comment-card">
                    <div className="profile-comment-context">
                      <HiMusicalNote size={14} />
                      <span>{c.track_title}</span>
                    </div>
                    <p className="profile-comment-content">{c.content}</p>
                    <div className="profile-comment-footer">
                      {c.score !== 0 && <span className="profile-comment-score">{c.score > 0 ? `+${c.score}` : c.score}</span>}
                      <span className="profile-comment-time">{formatRelativeTime(c.created_at)}</span>
                    </div>
                  </Link>
                ))}
              </div>
              {commentsTotalPages > 1 && (
                <div className="pagination">
                  <button className="btn-ghost" disabled={commentsPage <= 1} onClick={() => setCommentsPage((p) => p - 1)}>Previous</button>
                  <span className="pagination-info">Page {commentsPage} of {commentsTotalPages}</span>
                  <button className="btn-ghost" disabled={commentsPage >= commentsTotalPages} onClick={() => setCommentsPage((p) => p + 1)}>Next</button>
                </div>
              )}
            </>
          )
        )}
      </div>
    </div>
  );
}
