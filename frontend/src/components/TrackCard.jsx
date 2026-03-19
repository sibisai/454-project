import { Link } from 'react-router-dom';
import { HiMusicalNote } from 'react-icons/hi2';
import { formatRelativeTime } from '../utils/time';

function stripArtistSuffix(title, artist) {
  const suffix = ` by ${artist}`;
  return title.toLowerCase().endsWith(suffix.toLowerCase())
    ? title.slice(0, -suffix.length)
    : title;
}

export default function TrackCard({ track }) {
  const { id, title, artist_name, artwork_url, poster_display_name, post_count, created_at } = track;
  const displayTitle = stripArtistSuffix(title, artist_name);

  return (
    <Link to={`/tracks/${id}`} className="track-card">
      <div className="track-card-artwork">
        {artwork_url ? (
          <img src={artwork_url} alt={`${displayTitle} artwork`} width={80} height={80} />
        ) : (
          <HiMusicalNote size={32} className="track-card-artwork-placeholder" />
        )}
      </div>
      <div className="track-card-info">
        <h3 className="track-card-title">{displayTitle}</h3>
        <p className="track-card-artist">{artist_name}</p>
        <div className="track-card-meta">
          <span>Posted by {poster_display_name}</span>
          <span aria-hidden="true">&middot;</span>
          <span>{post_count} {post_count === 1 ? 'post' : 'posts'}</span>
          <span aria-hidden="true">&middot;</span>
          <span>{formatRelativeTime(created_at)}</span>
        </div>
      </div>
    </Link>
  );
}
