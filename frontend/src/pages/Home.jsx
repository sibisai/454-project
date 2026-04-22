import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { HiMagnifyingGlass, HiMusicalNote } from 'react-icons/hi2';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import TrackCard from '../components/TrackCard';
import Skeleton from '../components/Skeleton';
import './Home.css';

const PER_PAGE = 12;

function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <Skeleton variant="rect" style={{ aspectRatio: '1' }} width="100%" />
      <div className="skeleton-meta">
        <Skeleton width="50%" />
        <Skeleton width="75%" />
      </div>
    </div>
  );
}

export default function Home() {
  const { isAuthenticated } = useAuth();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sort, setSort] = useState('popular');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const queryClient = useQueryClient();
  const queryKey = ['tracks', page, debouncedSearch, sort];

  const { data, isLoading, error } = useQuery({
    queryKey,
    queryFn: async () => {
      const params = {
        page,
        per_page: PER_PAGE,
        search: debouncedSearch || undefined,
        sort: debouncedSearch ? undefined : sort,
      };
      const response = await api.get('/tracks', { params });
      return response.data;
    },
    placeholderData: (previousData) => previousData,
  });

  const tracks = data?.tracks ?? [];
  const total = data?.total ?? 0;

  const handleLike = useCallback(async (trackId, currentlyLiked) => {
    const previousData = queryClient.getQueryData(queryKey);

    queryClient.setQueryData(queryKey, (old) => {
      if (!old) return old;
      return {
        ...old,
        tracks: old.tracks.map((t) =>
          t.id === trackId
            ? { ...t, user_has_liked: !currentlyLiked, like_count: t.like_count + (currentlyLiked ? -1 : 1) }
            : t
        ),
      };
    });

    try {
      if (currentlyLiked) {
        await api.delete(`/tracks/${trackId}/like`);
      } else {
        await api.post(`/tracks/${trackId}/like`);
      }
    } catch {
      queryClient.setQueryData(queryKey, previousData);
    }
  }, [queryClient, queryKey]);

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

      {!debouncedSearch && (
        <div className="sort-tabs" role="tablist" aria-label="Sort tracks">
          <button
            role="tab"
            aria-selected={sort === 'popular'}
            className={`sort-tab${sort === 'popular' ? ' active' : ''}`}
            onClick={() => { setSort('popular'); setPage(1); }}
          >
            Popular
          </button>
          <button
            role="tab"
            aria-selected={sort === 'recent'}
            className={`sort-tab${sort === 'recent' ? ' active' : ''}`}
            onClick={() => { setSort('recent'); setPage(1); }}
          >
            Recent
          </button>
        </div>
      )}

      {error && (
        <div className="error-banner home-error-banner" role="alert" aria-live="assertive">
          Failed to load tracks. Please try again.
        </div>
      )}

      {isLoading && !data ? (
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
              <TrackCard
                key={track.id}
                track={track}
                onLike={handleLike}
                isAuthenticated={isAuthenticated}
              />
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
