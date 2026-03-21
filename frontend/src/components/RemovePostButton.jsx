import { useState } from 'react';
import { HiShieldExclamation } from 'react-icons/hi2';

export default function RemovePostButton({ onRemove, loading }) {
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <span className="post-confirm-remove">
        Remove?
        <button
          className="post-action post-action-warning"
          onClick={() => { onRemove(); setConfirming(false); }}
          disabled={loading}
        >
          {loading ? 'Removing...' : 'Yes'}
        </button>
        <button className="post-action" onClick={() => setConfirming(false)}>
          No
        </button>
      </span>
    );
  }

  return (
    <button className="post-action post-action-warning" onClick={() => setConfirming(true)}>
      <HiShieldExclamation size={14} />
      Remove
    </button>
  );
}
