const ROLE_LABELS = {
  artist: 'Artist',
  moderator: 'Mod',
  admin: 'Admin',
};

export default function RoleBadge({ role }) {
  if (!role || !ROLE_LABELS[role]) return null;
  return <span className={`badge badge-${role}`}>{ROLE_LABELS[role]}</span>;
}
