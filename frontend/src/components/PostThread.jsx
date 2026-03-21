import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { HiBookmark, HiPencil, HiTrash, HiChatBubbleLeft, HiHandThumbUp, HiHandThumbDown } from 'react-icons/hi2';
import { formatRelativeTime } from '../utils/time';
import RoleBadge from './RoleBadge';
import PinButton from './PinButton';
import RemovePostButton from './RemovePostButton';

const MAX_INDENT_DEPTH = 3;

function getAuthorRole(post, trackPosterId, moderatorIds) {
  if (post.author_id === trackPosterId) return 'artist';
  if (moderatorIds?.has(post.author_id)) return 'moderator';
  return null;
}

export default function PostThread({
  post, currentUser, depth = 0,
  onReply, onEdit, onDelete, onVotePost, isAuthenticated,
  userRole, trackId, trackPosterId, moderatorIds, pinnedCount, onPin, onRemove,
}) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [replying, setReplying] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [editing, setEditing] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!editOpen) setEditContent(post.content);
  }, [post.content, editOpen]);

  const isAuthor = currentUser?.id === post.author_id;
  const indentLevel = Math.min(depth, MAX_INDENT_DEPTH);
  const authorRole = getAuthorRole(post, trackPosterId, moderatorIds);

  const canPin = (userRole === 'artist' || userRole === 'admin') && !post.is_removed;
  const canRemove = (userRole === 'artist' || userRole === 'moderator' || userRole === 'admin') && !isAuthor && !post.is_removed;

  async function handleReply(e) {
    e.preventDefault();
    if (!replyContent.trim() || replying) return;
    setReplying(true);
    try {
      await onReply(post.id, replyContent.trim());
      setReplyContent('');
      setReplyOpen(false);
    } finally {
      setReplying(false);
    }
  }

  async function handleEdit(e) {
    e.preventDefault();
    if (!editContent.trim() || editing) return;
    setEditing(true);
    try {
      await onEdit(post.id, editContent.trim());
      setEditOpen(false);
    } finally {
      setEditing(false);
    }
  }

  async function handleDelete() {
    if (deleting) return;
    setDeleting(true);
    try {
      await onDelete(post.id);
      setConfirmDelete(false);
    } finally {
      setDeleting(false);
    }
  }

  const score = post.score || 0;
  const userVote = post.user_vote || 0;

  function VoteBtn({ value, activeClass, icon: Icon, label }) {
    if (!isAuthenticated) {
      return <span className="post-vote-btn" aria-hidden="true"><Icon size={14} /></span>;
    }
    return (
      <button
        className={`post-vote-btn${userVote === value ? ` ${activeClass}` : ''}`}
        onClick={() => onVotePost?.(post.id, value)}
        aria-label={label}
      >
        <Icon size={14} />
      </button>
    );
  }

  return (
    <div
      className="post-thread"
      style={{ marginLeft: indentLevel > 0 ? 'var(--space-5)' : 0 }}
    >
      <article className={['post', post.is_removed && 'post-removed', post.is_pinned && 'post-pinned'].filter(Boolean).join(' ')}>
        <div className="post-header">
          <span className="post-author">
            {post.is_pinned && <HiBookmark size={14} className="post-pin-icon" aria-label="Pinned" />}
            <Link to={`/users/${post.author_id}`} className="post-author-link">
              {post.author_display_name}
            </Link>
            <RoleBadge role={authorRole} />
          </span>
          <span className="post-time">{formatRelativeTime(post.created_at)}</span>
          {post.updated_at && !post.is_removed && (
            <span className="post-edited">(edited)</span>
          )}
        </div>

        {post.is_removed ? (
          <p className="post-content-removed">[removed]</p>
        ) : editOpen ? (
          <form onSubmit={handleEdit} className="post-edit-form">
            <textarea
              className="post-textarea"
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={3}
              maxLength={5000}
              aria-label="Edit post"
            />
            <div className="post-form-actions">
              <button type="submit" className="btn-accent post-action-btn" disabled={editing || !editContent.trim()}>
                {editing ? 'Saving...' : 'Save'}
              </button>
              <button type="button" className="btn-ghost post-action-btn" onClick={() => { setEditOpen(false); setEditContent(post.content); }}>
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <p className="post-content">{post.content}</p>
        )}

        {!post.is_removed && !editOpen && (
          <div className="post-actions">
            <div className="post-vote-group">
              <VoteBtn value={1} activeClass="voted-up" icon={HiHandThumbUp} label="Upvote" />
              {score !== 0 && <span className="post-vote-score">{score}</span>}
              <VoteBtn value={-1} activeClass="voted-down" icon={HiHandThumbDown} label="Downvote" />
            </div>
            {canPin && (
              <PinButton
                isPinned={post.is_pinned}
                disabled={pinnedCount >= 3 && !post.is_pinned}
                onClick={() => onPin(post.id, !post.is_pinned)}
              />
            )}
            {currentUser && (
              <button className="post-action" onClick={() => setReplyOpen(!replyOpen)}>
                <HiChatBubbleLeft size={14} />
                Reply
              </button>
            )}
            {isAuthor && (
              <>
                <button className="post-action" onClick={() => setEditOpen(true)}>
                  <HiPencil size={14} />
                  Edit
                </button>
                {confirmDelete ? (
                  <span className="post-confirm-delete">
                    Delete?
                    <button className="post-action post-action-danger" onClick={handleDelete} disabled={deleting}>
                      {deleting ? 'Deleting...' : 'Yes'}
                    </button>
                    <button className="post-action" onClick={() => setConfirmDelete(false)}>No</button>
                  </span>
                ) : (
                  <button className="post-action post-action-danger" onClick={() => setConfirmDelete(true)}>
                    <HiTrash size={14} />
                    Delete
                  </button>
                )}
              </>
            )}
            {canRemove && (
              <RemovePostButton onRemove={() => onRemove(post.id)} />
            )}
          </div>
        )}

        {replyOpen && (
          <form onSubmit={handleReply} className="post-reply-form">
            <textarea
              className="post-textarea"
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="Write a reply..."
              rows={2}
              maxLength={5000}
              aria-label="Reply to post"
              autoFocus
            />
            <div className="post-form-actions">
              <button type="submit" className="btn-accent post-action-btn" disabled={replying || !replyContent.trim()}>
                {replying ? 'Posting...' : 'Reply'}
              </button>
              <button type="button" className="btn-ghost post-action-btn" onClick={() => { setReplyOpen(false); setReplyContent(''); }}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </article>

      {post.replies?.length > 0 && (
        <div className="post-replies">
          {post.replies.map((reply) => (
            <PostThread
              key={reply.id}
              post={reply}
              currentUser={currentUser}
              depth={depth + 1}
              onReply={onReply}
              onEdit={onEdit}
              onDelete={onDelete}
              onVotePost={onVotePost}
              isAuthenticated={isAuthenticated}
              userRole={userRole}
              trackId={trackId}
              trackPosterId={trackPosterId}
              moderatorIds={moderatorIds}
              pinnedCount={pinnedCount}
              onPin={onPin}
              onRemove={onRemove}
            />
          ))}
        </div>
      )}
    </div>
  );
}
