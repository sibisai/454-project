import './Skeleton.css';

const toPx = (v) => (typeof v === 'number' ? `${v}px` : v);

export default function Skeleton({ variant = 'text', width, height, className = '' }) {
  const style = {};
  if (width) style.width = toPx(width);
  if (height) style.height = toPx(height);

  return (
    <span
      className={`skeleton skeleton--${variant} ${className}`}
      style={style}
      aria-hidden="true"
    />
  );
}
