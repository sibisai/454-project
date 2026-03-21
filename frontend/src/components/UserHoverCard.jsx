import { useState, useRef, useEffect, useCallback } from 'react';
import { useUserProfile } from '../hooks/useUserCache';
import { formatRelativeTime } from '../utils/time';
import RoleBadge from './RoleBadge';
import Skeleton from './Skeleton';
import './UserHoverCard.css';

const canHover = typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches;

export default function UserHoverCard({ userId, children }) {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [position, setPosition] = useState({ above: false, right: false });
  const { user, loading, fetch } = useUserProfile(userId);

  const showTimer = useRef(null);
  const hideTimer = useRef(null);
  const cardRef = useRef(null);
  const triggerRef = useRef(null);

  const show = useCallback(() => {
    clearTimeout(hideTimer.current);
    setExiting(false);
    showTimer.current = setTimeout(() => {
      setVisible(true);
      fetch();
    }, 300);
  }, [fetch]);

  const hide = useCallback(() => {
    clearTimeout(showTimer.current);
    hideTimer.current = setTimeout(() => {
      setExiting(true);
      setTimeout(() => {
        setVisible(false);
        setExiting(false);
      }, 100);
    }, 150);
  }, []);

  const cancelHide = useCallback(() => {
    clearTimeout(hideTimer.current);
    setExiting(false);
  }, []);

  // Adjust position if card overflows viewport
  useEffect(() => {
    if (!visible || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const newPos = { above: false, right: false };
    if (rect.bottom > window.innerHeight) newPos.above = true;
    if (rect.right > window.innerWidth) newPos.right = true;
    setPosition(newPos);
  }, [visible, user]);

  // Close on scroll
  useEffect(() => {
    if (!visible) return;
    const onScroll = () => {
      clearTimeout(showTimer.current);
      clearTimeout(hideTimer.current);
      setVisible(false);
      setExiting(false);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [visible]);

  useEffect(() => {
    return () => {
      clearTimeout(showTimer.current);
      clearTimeout(hideTimer.current);
    };
  }, []);

  if (!canHover) return children;

  const cardClass = [
    'hover-card',
    position.above && 'hover-card--above',
    position.right && 'hover-card--right',
    exiting && 'hover-card--out',
  ].filter(Boolean).join(' ');

  return (
    <span
      className="hover-card-trigger"
      ref={triggerRef}
      onMouseEnter={show}
      onMouseLeave={hide}
    >
      {children}
      {visible && (
        <div
          className={cardClass}
          ref={cardRef}
          onMouseEnter={cancelHide}
          onMouseLeave={hide}
        >
          {loading || !user ? (
            <div className="hover-card-loading">
              <Skeleton width="70%" height={16} />
              <Skeleton width="50%" height={12} />
              <Skeleton width="60%" height={12} />
            </div>
          ) : (
            <>
              <div className="hover-card-name">
                {user.display_name}
                {user.global_role && <RoleBadge role={user.global_role} />}
              </div>
              <div className="hover-card-joined">
                Joined {formatRelativeTime(user.created_at)}
              </div>
              <div className="hover-card-stats">
                <span className="hover-card-stat">
                  <strong>{user.track_count}</strong> tracks
                </span>
                <span className="hover-card-stat">
                  <strong>{user.post_count}</strong> comments
                </span>
              </div>
            </>
          )}
        </div>
      )}
    </span>
  );
}
