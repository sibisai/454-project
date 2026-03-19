import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { HiMagnifyingGlass, HiMusicalNote } from 'react-icons/hi2';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import TrackCard from '../components/TrackCard';
import './Home.css';

const PER_PAGE = 12;

function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <div className="skeleton-artwork" />
      <div className="skeleton-lines">
        <div className="skeleton-line" />
        <div className="skeleton-line" />
        <div className="skeleton-line" />
      </div>
    </div>
  );
}

export default function Home() {
  const { isAuthenticated } = useAuth();
  const [tracks, setTracks] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    api.get('/tracks', {
      params: {
        page,
        per_page: PER_PAGE,
        search: debouncedSearch || undefined,
      },
    })
      .then(({ data }) => {
        if (cancelled) return;
        setTracks(data.tracks);
        setTotal(data.total);
      })
      .catch(() => {
        if (cancelled) return;
        setError('Failed to load tracks. Please try again.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [page, debouncedSearch]);

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <div className="home-container">
      {!isAuthenticated ? (
        <section className="home-hero">
          <h1 className="home-hero-title">Discover &amp; Discuss Music</h1>
          <p className="home-hero-subtitle">Share SoundCloud tracks and join the conversation.</p>
          {total > 0 && (
            <p className="home-hero-stat">{total} tracks shared so far</p>
          )}
          <Link to="/register" className="btn-accent home-hero-cta">Get Started</Link>
        </section>
      ) : (
        <h1 className="sr-only">SoundBoard</h1>
      )}

      <div className="home-header">
        <div className="search-wrapper">
          <HiMagnifyingGlass size={18} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search tracks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search tracks"
          />
        </div>
        {isAuthenticated && (
          <Link to="/tracks/new" className="btn-accent home-post-btn">
            Post a Track
          </Link>
        )}
      </div>

      {error && (
        <div className="error-banner home-error-banner" role="alert" aria-live="assertive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="track-list">
          {Array.from({ length: 4 }, (_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : tracks.length === 0 ? (
        debouncedSearch ? (
          <div className="empty-state">
            <HiMagnifyingGlass size={48} className="empty-state-icon" />
            <h2>No tracks found for &ldquo;{debouncedSearch}&rdquo;</h2>
            <p>Try different keywords or check for typos.</p>
          </div>
        ) : (
          <div className="empty-state">
            <HiMusicalNote size={48} className="empty-state-icon" />
            <h2>No tracks yet</h2>
            <p>Be the first to share a SoundCloud track with the community.</p>
            {isAuthenticated ? (
              <Link to="/tracks/new" className="btn-accent empty-state-cta">
                Post the first track
              </Link>
            ) : (
              <Link to="/register" className="btn-accent empty-state-cta">
                Sign up to post
              </Link>
            )}
          </div>
        )
      ) : (
        <>
          <div className="track-list">
            {tracks.map((track) => (
              <TrackCard key={track.id} track={track} />
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
