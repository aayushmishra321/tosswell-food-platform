import { useState } from 'react';

function PizzaSvg() {
  return (
    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="w-full h-full">
      <circle cx="100" cy="100" r="90" fill="#e2a93b"/>
      <circle cx="100" cy="100" r="78" fill="#cf3b2d"/>
      <circle cx="100" cy="100" r="70" fill="#f5c842" opacity=".9"/>
      <ellipse cx="85" cy="85" rx="18" ry="13" fill="#f7d96e" opacity=".8"/>
      <ellipse cx="118" cy="90" rx="15" ry="11" fill="#f7d96e" opacity=".8"/>
      <ellipse cx="95" cy="118" rx="20" ry="12" fill="#f7d96e" opacity=".8"/>
      <circle cx="80" cy="78" r="6" fill="#1d2a23"/><circle cx="80" cy="78" r="2.5" fill="#e2a93b"/>
      <circle cx="122" cy="82" r="5" fill="#1d2a23"/><circle cx="122" cy="82" r="2" fill="#e2a93b"/>
      <circle cx="100" cy="120" r="6" fill="#1d2a23"/><circle cx="100" cy="120" r="2.5" fill="#e2a93b"/>
      <ellipse cx="108" cy="68" rx="7" ry="4" fill="#1f5c3a" transform="rotate(-20 108 68)"/>
      <ellipse cx="75" cy="108" rx="7" ry="4" fill="#1f5c3a" transform="rotate(30 75 108)"/>
      <ellipse cx="92" cy="98" rx="8" ry="5" fill="#c8a07a"/>
      <rect x="89" y="98" width="6" height="6" rx="1" fill="#c8a07a"/>
    </svg>
  );
}

export default function PizzaImage({ src, alt = 'Pizza', className = '', lazy = true, aspectRatio = 'aspect-[4/3]' }) {
  const [failed, setFailed] = useState(false);
  const wrap = `overflow-hidden bg-paper flex items-center justify-center ${aspectRatio} ${className}`;
  if (!src || failed) return <div className={wrap}><div className="w-3/4 h-3/4"><PizzaSvg /></div></div>;
  return (
    <div className={wrap}>
      <img src={src} alt={alt} loading={lazy ? 'lazy' : 'eager'}
        onError={() => setFailed(true)} className="w-full h-full object-cover" />
    </div>
  );
}
