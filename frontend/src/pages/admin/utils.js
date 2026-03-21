export const ACTION_LABELS = {
  post_removed: 'removed a post',
  user_banned: 'banned a user',
  user_unbanned: 'unbanned a user',
  role_changed: 'changed a user role',
  mod_delegated: 'delegated moderator',
  mod_revoked: 'revoked moderator',
  post_pinned: 'pinned a post',
  post_unpinned: 'unpinned a post',
};

export const ACTION_COLORS = {
  post_removed: '#EF4444',
  user_banned: '#EF4444',
  user_unbanned: '#10B981',
  role_changed: '#06B6D4',
  mod_delegated: '#10B981',
  mod_revoked: '#F59E0B',
  post_pinned: '#06B6D4',
  post_unpinned: '#F59E0B',
};

export const ALL_ACTIONS = Object.keys(ACTION_LABELS);

export function humanizeAction(action) {
  return ACTION_LABELS[action] || action.replace(/_/g, ' ');
}
