import { memo } from 'react';
import { Link } from 'react-router-dom';
import { HiHeart, HiOutlineHeart, HiChatBubbleLeft, HiMusicalNote } from 'react-icons/hi2';
import { formatRelativeTime } from '../utils/time';
import ShareButton from './ShareButton';
import UserHoverCard from './UserHoverCard';

export default memo(function TrackCard({ track, onLike, isAuthenticated }) {
  const { id, title, artist_name, posted_by, poster_display_name, post_count, like_count, user_has_liked, created_at, artwork_url } = track;

  function handleLikeClick(e) {
    e.preventDefault();
    e.stopPropagation();
    onLike?.(id, user_has_liked);
  }

  return (
    <Link to={`/tracks/${id}`} className="track-card">
      <div className="track-card-artwork">
        {artwork_url ? (
          <img src={artwork_url} alt={`${title} by ${artist_name}`} loading="lazy" />
        ) : (
          <div className="track-card-artwork-fallback">
            <HiMusicalNote size={32} />
          </div>
        )}
      </div>
      <div className="track-card-content">
        <div className="track-card-info">
          <h3 className="track-card-title">{title}</h3>
          <p className="track-card-artist">{artist_name}</p>
        </div>
        <div className="track-card-meta">
          <span className="track-card-meta-item">
            <UserHoverCard userId={posted_by}>
              <Link
                to={`/users/${posted_by}`}
                className="track-card-poster"
                onClick={(e) => e.stopPropagation()}
              >
                {poster_display_name}
              </Link>
            </UserHoverCard>
          </span>
          <span className="track-card-meta-item">
            <HiChatBubbleLeft size={14} />
            {post_count}
          </span>
          <span className="track-card-meta-item track-card-time">
            {formatRelativeTime(created_at)}
          </span>
        </div>
      </div>
      <div className="track-card-actions">
        <ShareButton url={`${window.location.origin}/tracks/${id}`} variant="icon" />
        {isAuthenticated ? (
          <button
            className={`track-card-like${user_has_liked ? ' liked' : ''}`}
            onClick={handleLikeClick}
            aria-label={user_has_liked ? 'Unlike track' : 'Like track'}
          >
            {user_has_liked ? <HiHeart size={18} /> : <HiOutlineHeart size={18} />}
            {like_count > 0 && <span>{like_count}</span>}
          </button>
        ) : like_count > 0 ? (
          <span className="track-card-like disabled" aria-label={`${like_count} likes`}>
            <HiOutlineHeart size={18} />
            <span>{like_count}</span>
          </span>
        ) : null}
      </div>
    </Link>
  );
});
