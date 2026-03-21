import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { HiChatBubbleLeftRight, HiHeart, HiOutlineHeart } from 'react-icons/hi2';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import { formatRelativeTime } from '../utils/time';
import { stripArtistSuffix } from '../utils/format';
import SoundCloudEmbed from '../components/SoundCloudEmbed';
import PostThread from '../components/PostThread';
import ModeratorPanel from '../components/ModeratorPanel';
import './TrackDetail.css';

function TrackDetailSkeleton() {
  return (
    <div className="detail-container">
      <div className="skeleton-embed-lg" />
      <div className="skeleton-meta-bar">
        <div className="skeleton-line" style={{ width: '60%' }} />
      </div>
    </div>
  );
}

export default function TrackDetail() {
  const { id } = useParams();
  const { user, isAuthenticated } = useAuth();

  const [track, setTrack] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [mutationError, setMutationError] = useState('');
  const [moderatorIds, setModeratorIds] = useState(new Set());

  const [newPost, setNewPost] = useState('');
  const [posting, setPosting] = useState(false);
  const [commentSort, setCommentSort] = useState('recent');

  const fetchTrack = useCallback(async () => {
    try {
      const { data } = await api.get(`/tracks/${id}`);
      setTrack(data);
      setPageError('');
    } catch (err) {
      if (err.response?.status === 404) {
        setPageError('not_found');
      } else {
        setPageError('Failed to load track. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchModerators = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const { data } = await api.get(`/tracks/${id}/moderators`);
      setModeratorIds(new Set((data.moderators || []).map((m) => m.user_id)));
    } catch {
      // Non-critical — badges just won't show for mods
    }
  }, [id, isAuthenticated]);

  useEffect(() => {
    fetchTrack();
    fetchModerators();
  }, [fetchTrack, fetchModerators]);

  async function handleNewPost(e) {
    e.preventDefault();
    if (!newPost.trim() || posting) return;
    setPosting(true);
    setMutationError('');
    try {
      await api.post(`/tracks/${id}/posts`, { content: newPost.trim() });
      setNewPost('');
      await fetchTrack();
    } catch {
      setMutationError('Failed to post. Please try again.');
    } finally {
      setPosting(false);
    }
  }

  async function mutatePost(apiCall, errorMsg) {
    setMutationError('');
    try {
      await apiCall();
      await fetchTrack();
    } catch {
      setMutationError(errorMsg);
    }
  }

  const handleReply = (postId, content) =>
    mutatePost(() => api.post(`/posts/${postId}/replies`, { content }), 'Failed to post reply. Please try again.');

  const handleEdit = (postId, content) =>
    mutatePost(() => api.put(`/posts/${postId}`, { content }), 'Failed to save edit. Please try again.');

  const handleDelete = (postId) =>
    mutatePost(() => api.delete(`/posts/${postId}`), 'Failed to delete post. Please try again.');

  const handleRemove = (postId) =>
    mutatePost(() => api.delete(`/posts/${postId}`), 'Failed to remove post. Please try again.');

  async function handlePin(postId, pin) {
    const method = pin ? 'post' : 'delete';
    await mutatePost(
      () => api[method](`/tracks/${id}/pin/${postId}`),
      `Failed to ${pin ? 'pin' : 'unpin'} post.`
    );
  }

  async function handleLike() {
    if (!track || !isAuthenticated) return;
    const wasLiked = track.user_has_liked;

    setTrack((prev) => ({
      ...prev,
      user_has_liked: !wasLiked,
      like_count: prev.like_count + (wasLiked ? -1 : 1),
    }));

    try {
      if (wasLiked) {
        await api.delete(`/tracks/${id}/like`);
      } else {
        await api.post(`/tracks/${id}/like`);
      }
    } catch {
      setTrack((prev) => ({
        ...prev,
        user_has_liked: wasLiked,
        like_count: prev.like_count + (wasLiked ? 1 : -1),
      }));
    }
  }

  async function handleVotePost(postId, value) {
    if (!isAuthenticated) return;

    const findPost = (posts) => {
      for (const p of posts) {
        if (p.id === postId) return p;
        const found = p.replies && findPost(p.replies);
        if (found) return found;
      }
      return null;
    };
    const currentVote = findPost(track.posts)?.user_vote || 0;
    const newVote = value === currentVote ? 0 : value;
    const scoreDelta = newVote - currentVote;

    setTrack((prev) => {
      if (!prev) return prev;
      const updatePosts = (posts) =>
        posts.map((p) => ({
          ...p,
          score: p.id === postId ? (p.score || 0) + scoreDelta : p.score,
          user_vote: p.id === postId ? newVote : p.user_vote,
          replies: p.replies ? updatePosts(p.replies) : [],
        }));
      return { ...prev, posts: updatePosts(prev.posts) };
    });

    try {
      if (newVote === 0) {
        await api.delete(`/posts/${postId}/vote`);
      } else {
        await api.post(`/posts/${postId}/vote`, { value: newVote });
      }
    } catch {
      await fetchTrack();
    }
  }

  if (loading) return <TrackDetailSkeleton />;

  if (pageError === 'not_found') {
    return (
      <div className="error-page">
        <h1 className="error-code">404</h1>
        <p className="error-message">Track Not Found</p>
        <p className="error-description">This track may have been removed.</p>
        <Link to="/" className="error-link">Back to Home</Link>
      </div>
    );
  }

  if (pageError && !track) {
    return (
      <div className="error-page">
        <p className="error-message">{pageError}</p>
        <Link to="/" className="error-link">Back to Home</Link>
      </div>
    );
  }

  const displayTitle = stripArtistSuffix(track.title, track.artist_name);
  const commentLabel = `${track.post_count} ${track.post_count === 1 ? 'comment' : 'comments'}`;
  const userRole = track.user_role;
  const canManageMods = userRole === 'artist' || userRole === 'admin';
  const pinnedCount = (track.posts || []).filter((p) => p.is_pinned).length;

  // Sort: pinned first, then by selected sort mode
  const sortedPosts = [...(track.posts || [])].sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;
    if (commentSort === 'popular') return (b.score || 0) - (a.score || 0);
    return new Date(b.created_at) - new Date(a.created_at);
  });

  return (
    <div className="detail-container">
      <h1 className="sr-only">{displayTitle} by {track.artist_name}</h1>

      <section className="detail-player" aria-label="SoundCloud player">
        <SoundCloudEmbed embedHtml={track.embed_html} artworkUrl={track.artwork_url} />
      </section>

      <div className="detail-meta-bar">
        <div className="detail-meta">
          <span>
            Posted by{' '}
            <Link to={`/users/${track.posted_by}`} className="post-author-link">
              {track.poster_display_name}
            </Link>
          </span>
          <span aria-hidden="true">&middot;</span>
          <span>{formatRelativeTime(track.created_at)}</span>
          <span aria-hidden="true">&middot;</span>
          <span>{commentLabel}</span>
        </div>
        {isAuthenticated ? (
          <button
            className={`detail-like-btn${track.user_has_liked ? ' liked' : ''}`}
            onClick={handleLike}
            aria-label={track.user_has_liked ? 'Unlike track' : 'Like track'}
          >
            {track.user_has_liked ? <HiHeart size={18} /> : <HiOutlineHeart size={18} />}
            <span>{track.like_count}</span>
          </button>
        ) : track.like_count > 0 ? (
          <span className="detail-like-count">
            <HiOutlineHeart size={16} />
            {track.like_count}
          </span>
        ) : null}
      </div>

      {userRole && (
        <div className={`role-indicator role-indicator-${userRole}`}>
          {userRole === 'artist' && 'You are the artist on this track'}
          {userRole === 'moderator' && 'You are a moderator on this track'}
          {userRole === 'admin' && 'You are an admin'}
        </div>
      )}

      {canManageMods && <ModeratorPanel trackId={id} />}

      <section className="detail-discussion" aria-label="Discussion">
        <div className="discussion-header">
          <h2 className="detail-section-title">
            <HiChatBubbleLeftRight size={20} />
            Discussion
            <span className="detail-comment-count">&middot; {commentLabel}</span>
          </h2>
          {track.posts?.length > 1 && (
            <div className="discussion-sort-tabs" role="tablist" aria-label="Sort comments">
              <button
                role="tab"
                aria-selected={commentSort === 'popular'}
                className={`sort-tab${commentSort === 'popular' ? ' active' : ''}`}
                onClick={() => setCommentSort('popular')}
              >
                Popular
              </button>
              <button
                role="tab"
                aria-selected={commentSort === 'recent'}
                className={`sort-tab${commentSort === 'recent' ? ' active' : ''}`}
                onClick={() => setCommentSort('recent')}
              >
                Recent
              </button>
            </div>
          )}
        </div>

        {isAuthenticated ? (
          <form onSubmit={handleNewPost} className="new-post-form">
            <textarea
              className="post-textarea"
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
              placeholder="Share your thoughts on this track..."
              rows={3}
              maxLength={5000}
              aria-label="Write a comment"
            />
            <div className="new-post-footer">
              <span className="char-count">{newPost.length}/5000</span>
              <button
                type="submit"
                className="btn-accent new-post-submit"
                disabled={posting || !newPost.trim()}
              >
                {posting ? 'Posting...' : 'Post'}
              </button>
            </div>
          </form>
        ) : (
          <p className="detail-login-prompt">
            <Link to="/login">Log in</Link> to join the discussion.
          </p>
        )}

        {mutationError && (
          <div className="error-banner" role="alert" aria-live="assertive">
            {mutationError}
          </div>
        )}

        {sortedPosts.length > 0 ? (
          <div className="post-list">
            {sortedPosts.map((post) => (
              <PostThread
                key={post.id}
                post={post}
                currentUser={user}
                userRole={userRole}
                trackId={id}
                trackPosterId={track.posted_by}
                moderatorIds={moderatorIds}
                pinnedCount={pinnedCount}
                onReply={handleReply}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onPin={handlePin}
                onRemove={handleRemove}
                onVotePost={handleVotePost}
                isAuthenticated={isAuthenticated}
              />
            ))}
          </div>
        ) : (
          <div className="empty-discussion">
            <HiChatBubbleLeftRight size={36} className="empty-discussion-icon" />
            <p>No comments yet. Be the first to start the discussion.</p>
          </div>
        )}
      </section>
    </div>
  );
}
