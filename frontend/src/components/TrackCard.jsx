import { Link } from 'react-router-dom';
import { HiHeart, HiOutlineHeart } from 'react-icons/hi2';
import { formatRelativeTime } from '../utils/time';
import SoundCloudEmbed from './SoundCloudEmbed';
import ShareButton from './ShareButton';
import UserHoverCard from './UserHoverCard';

export default function TrackCard({ track, onLike, isAuthenticated }) {
  const { id, posted_by, poster_display_name, post_count, like_count, user_has_liked, created_at, embed_html, artwork_url } = track;

  function handleLikeClick(e) {
    e.preventDefault();
    e.stopPropagation();
    onLike?.(id, user_has_liked);
  }

  return (
    <Link to={`/tracks/${id}`} className="track-card-wrapper">
      {embed_html && (
        <div className="track-card-embed" aria-hidden="true" tabIndex={-1}>
          <SoundCloudEmbed embedHtml={embed_html} artworkUrl={artwork_url} />
        </div>
      )}
      <div className="track-card-body">
        <span className="track-card-meta-link">
          <span>Posted by <UserHoverCard userId={posted_by}><Link to={`/users/${posted_by}`} className="post-author-link" onClick={(e) => e.stopPropagation()}>{poster_display_name}</Link></UserHoverCard></span>
          <span aria-hidden="true">&middot;</span>
          <span>{post_count} {post_count === 1 ? 'comment' : 'comments'}</span>
          <span aria-hidden="true">&middot;</span>
          <span>{formatRelativeTime(created_at)}</span>
        </span>
        <ShareButton url={`${window.location.origin}/tracks/${id}`} variant="icon" />
        {isAuthenticated ? (
          <button
            className={`track-card-like${user_has_liked ? ' liked' : ''}`}
            onClick={handleLikeClick}
            aria-label={user_has_liked ? 'Unlike track' : 'Like track'}
          >
            {user_has_liked ? <HiHeart size={18} /> : <HiOutlineHeart size={18} />}
            {like_count > 0 && <span className="track-card-like-count">{like_count}</span>}
          </button>
        ) : like_count > 0 ? (
          <span className="track-card-like disabled" aria-label={`${like_count} likes`}>
            <HiOutlineHeart size={18} />
            <span className="track-card-like-count">{like_count}</span>
          </span>
        ) : null}
      </div>
    </Link>
  );
}
