/**
 * UserAvatar — shared avatar component.
 * Shows the user's profile picture if available, otherwise a coloured
 * initial-based placeholder.
 *
 * Props:
 *  user        — user object (needs .name and optionally .profilePicture)
 *  size        — pixel size of the circle (default 40)
 *  className   — extra CSS class
 *  style       — extra inline styles
 */

import { getAvatarSource } from '../../utils/avatar';

function nameToColor(name = '') {
  const palette = [
    '#1e5e3a', '#2e7d52', '#b38f4d', '#8b6914',
    '#2d6a8f', '#6b4c9a', '#c0392b', '#16a085',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
}

function initials(name = '') {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return (parts[0]?.[0] || '?').toUpperCase();
}

export default function UserAvatar({ user, size = 40, className = '', style = {} }) {
  const hasPhoto = user?.profilePicture;
  const src = hasPhoto ? getAvatarSource(user.profilePicture) : null;
  const bg = nameToColor(user?.name);
  const fontSize = Math.max(10, Math.floor(size * 0.38));

  const base = {
    width: size,
    height: size,
    borderRadius: '50%',
    flexShrink: 0,
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: hasPhoto ? 'transparent' : bg,
    color: '#fff',
    fontWeight: 700,
    fontSize,
    userSelect: 'none',
    ...style,
  };

  return (
    <div className={className} style={base}>
      {hasPhoto
        ? <img src={src} alt={user?.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : <span>{initials(user?.name)}</span>
      }
    </div>
  );
}
