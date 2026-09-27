const INK = '#161821';

function Eyes({ style }) {
  switch (style) {
    case 'wink':
      return (
        <>
          <circle cx="14.5" cy="17" r="3" fill={INK} />
          <circle cx="15.5" cy="16" r="0.9" fill="#fff" />
          <path d="M22.5 17 Q25.5 14 28.5 17" stroke={INK} strokeWidth="2.3" fill="none" strokeLinecap="round" />
        </>
      );
    case 'star': {
      const star = (cx, cy) => (
        <path
          key={cx}
          transform={`translate(${cx},${cy}) scale(0.34)`}
          d="M0,-9 L2.5,-2.7 L9,-2.7 L3.8,1.3 L5.9,7.6 L0,3.8 L-5.9,7.6 L-3.8,1.3 L-9,-2.7 L-2.5,-2.7 Z"
          fill={INK}
        />
      );
      return <>{star(14.5, 17)}{star(25.5, 17)}</>;
    }
    case 'happy':
      return (
        <>
          <path d="M11 17 Q14.5 12.5 18 17" stroke={INK} strokeWidth="2.3" fill="none" strokeLinecap="round" />
          <path d="M22 17 Q25.5 12.5 29 17" stroke={INK} strokeWidth="2.3" fill="none" strokeLinecap="round" />
        </>
      );
    case 'sleepy':
      return (
        <>
          <line x1="11.5" y1="17" x2="17.5" y2="17" stroke={INK} strokeWidth="2.3" strokeLinecap="round" />
          <line x1="22.5" y1="17" x2="28.5" y2="17" stroke={INK} strokeWidth="2.3" strokeLinecap="round" />
        </>
      );
    case 'cool':
      return (
        <>
          <rect x="10.5" y="14.5" width="9" height="5.5" rx="2.5" fill={INK} />
          <rect x="20.5" y="14.5" width="9" height="5.5" rx="2.5" fill={INK} />
          <rect x="19" y="16.5" width="2" height="1.6" fill={INK} />
        </>
      );
    case 'classic':
    default:
      return (
        <>
          <circle cx="14.5" cy="17" r="3" fill={INK} />
          <circle cx="25.5" cy="17" r="3" fill={INK} />
          <circle cx="15.5" cy="16" r="0.9" fill="#fff" />
          <circle cx="26.5" cy="16" r="0.9" fill="#fff" />
        </>
      );
  }
}

export default function Avatar({ id = 'yellow-classic', size = 40 }) {
  const [base, style] = id.split('-');
  const isYellow = base === 'yellow';
  const c1 = isYellow ? '#FFD23F' : '#5B9EF2';
  const c2 = isYellow ? '#FFB800' : '#3B7DDB';

  return (
    <svg viewBox="0 0 40 40" width={size} height={size} xmlns="http://www.w3.org/2000/svg">
      <circle cx="20" cy="20" r="18.5" fill={c1} stroke={c2} strokeWidth="2" />
      <Eyes style={style} />
      <path d="M13.5 26 Q20 33.5 26.5 26 Q20 30 13.5 26 Z" fill="#FF6FA5" stroke={INK} strokeWidth="1.3" />
    </svg>
  );
}
