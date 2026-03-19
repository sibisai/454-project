import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { HiMusicalNote } from 'react-icons/hi2';
import api from '../services/api';
import './TrackSubmit.css';

const RESERVED_PATHS = /^https?:\/\/(www\.)?soundcloud\.com\/(discover|charts|settings|you|jobs|pages|upload|messages|notifications)\b/;
const SOUNDCLOUD_RE = /^https?:\/\/(www\.)?soundcloud\.com\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+/;

export default function TrackSubmit() {
  const navigate = useNavigate();
  const timerRef = useRef(null);
  const [url, setUrl] = useState('');
  const [urlError, setUrlError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [duplicateTrackId, setDuplicateTrackId] = useState(null);
  const [preview, setPreview] = useState(null);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmed = url.trim();
    if (RESERVED_PATHS.test(trimmed) || !SOUNDCLOUD_RE.test(trimmed)) {
      setUrlError('Please enter a valid SoundCloud track URL');
      return;
    }

    setError('');
    setDuplicateTrackId(null);
    setSubmitting(true);

    try {
      const { data } = await api.post('/tracks', { soundcloud_url: trimmed });
      setPreview(data);
      timerRef.current = setTimeout(() => navigate(`/tracks/${data.id}`), 2000);
    } catch (err) {
      const status = err.response?.status;
      const body = err.response?.data;

      if (status === 409) {
        setError('This track has already been posted.');
        if (body?.existing_track_id) {
          setDuplicateTrackId(body.existing_track_id);
        }
      } else if (status === 400) {
        setError('Invalid SoundCloud URL — please check the link and try again.');
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="submit-container">
      <div className="submit-card">
        <h1 className="auth-title">Post a Track</h1>
        <p className="auth-subtitle">Share a SoundCloud track with the community</p>

        {error && (
          <div className="error-banner" role="alert" aria-live="assertive">
            {error}
            {duplicateTrackId && (
              <>
                {' '}
                <Link to={`/tracks/${duplicateTrackId}`} className="duplicate-link">
                  View existing discussion
                </Link>
              </>
            )}
          </div>
        )}

        {preview ? (
          <>
            <div className="success-banner" role="status">Track posted successfully! Redirecting...</div>
            <div className="track-preview">
              <div className="track-preview-artwork">
                {preview.artwork_url ? (
                  <img src={preview.artwork_url} alt={`${preview.title} artwork`} />
                ) : (
                  <HiMusicalNote size={40} className="track-preview-placeholder" />
                )}
              </div>
              <div className="track-preview-info">
                <span className="track-preview-title">{preview.title}</span>
                <span className="track-preview-artist">{preview.artist_name}</span>
              </div>
            </div>
          </>
        ) : (
          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="soundcloud-url" className="form-label">SoundCloud URL</label>
              <input
                id="soundcloud-url"
                type="url"
                className={`form-input${urlError ? ' input-error' : ''}`}
                placeholder="https://soundcloud.com/artist/track"
                value={url}
                onChange={(e) => { setUrl(e.target.value); setUrlError(''); }}
                required
                autoFocus
              />
              {urlError && <span className="field-error">{urlError}</span>}
            </div>
            <button type="submit" className="btn-submit" disabled={submitting}>
              {submitting ? 'Submitting...' : 'Post Track'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
