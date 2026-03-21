import { BsPinAngleFill, BsPinAngle } from 'react-icons/bs';

export default function PinButton({ isPinned, disabled, onClick, loading }) {
  const Icon = isPinned ? BsPinAngleFill : BsPinAngle;
  return (
    <button
      className={`post-action post-action-pin${isPinned ? ' pinned' : ''}`}
      onClick={onClick}
      disabled={disabled || loading}
      title={disabled ? 'Maximum 3 pinned posts' : isPinned ? 'Unpin' : 'Pin'}
      aria-label={isPinned ? 'Unpin post' : 'Pin post'}
    >
      <Icon size={14} />
      {isPinned ? 'Unpin' : 'Pin'}
    </button>
  );
}
