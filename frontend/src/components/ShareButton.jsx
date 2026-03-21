import { useState, useCallback, useRef, useEffect } from 'react';
import { HiLink } from 'react-icons/hi2';
import './ShareButton.css';

export default function ShareButton({ url, variant = 'button' }) {
  const [toast, setToast] = useState(null);
  const timerRef = useRef(null);
  const exitTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      clearTimeout(timerRef.current);
      clearTimeout(exitTimerRef.current);
    };
  }, []);

  const copyToClipboard = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = url;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }

    clearTimeout(timerRef.current);
    clearTimeout(exitTimerRef.current);
    setToast('in');
    timerRef.current = setTimeout(() => {
      setToast('out');
      exitTimerRef.current = setTimeout(() => setToast(null), 200);
    }, 2000);
  }, [url]);

  const isIcon = variant === 'icon';

  return (
    <span className="share-btn-wrapper">
      <button
        className={`share-btn${isIcon ? ' share-btn--icon' : ''}`}
        onClick={copyToClipboard}
        aria-label="Copy link"
        title="Copy link"
      >
        <HiLink size={isIcon ? 16 : 18} />
        {!isIcon && <span>Share</span>}
      </button>
      {toast && (
        <span
          className={`share-toast${toast === 'out' ? ' share-toast--out' : ''}`}
          aria-live="polite"
        >
          Link copied!
        </span>
      )}
    </span>
  );
}
