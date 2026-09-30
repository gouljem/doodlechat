const ICONS = {
  plus: 'M12 5v14M5 12h14',
  key: 'M8 18a4 4 0 1 0 3.87-4.1L16 9.8V7h2V5h3v3h-2v2h-2.2l-3.7 3.7A4 4 0 0 0 8 18zM8 16a2 2 0 1 1 0-4 2 2 0 0 1 0 4z',
  users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  crown: 'M2 17l2-9 5 4 3-7 3 7 5-4 2 9H2zM4 20h16',
  wave: 'M4 14c1.8-2.2 3.2-2.2 4.5-.4 1.3 1.8 2.7 1.8 4.5-.2 1.8-2 3.2-2 4.5-.2 1.3 1.8 2.7 1.8 4.5-.4M7.5 10.5c.5-1.2 1.4-2 2.5-2',
  x: 'M18 6 6 18M6 6l12 12',
  lock: 'M7 11V8a5 5 0 0 1 10 0v3M6 11h12v10H6z',
  clock: 'M12 8v5l3 2M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z',
  shield: 'M12 3l8 3v6c0 5-3.4 8.4-8 10-4.6-1.6-8-5-8-10V6l8-3z',
  chat: 'M21 12a8 8 0 0 1-8 8H7l-4 3V12a8 8 0 0 1 8-8h2a8 8 0 0 1 8 8z',
  send: 'M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z',
  copy: 'M8 8h12v12H8zM4 16V4h12',
  leave: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
  spark: 'M12 3v4M12 17v4M4.9 6.5l2.8 2.8M16.3 14.7l2.8 2.8M3 12h4M17 12h4M4.9 17.5l2.8-2.8M16.3 9.3l2.8-2.8',
  list: 'M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01',
  info: 'M12 11v6M12 8h.01M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z',
  timer: 'M12 9v4l2.5 1.5M10 3h4M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16z',
  hash: 'M4 9h16M4 15h16M10 3 8 21M16 3l-2 18',
  chevron: 'M9 18l6-6-6-6',
  nose: 'M9 5c3 2 4 5 4 8l4 3c.7.5.4 1.5-.5 1.7l-3.5.6c-1.8.3-3.5-.2-4.5-1.3',
};

export default function Icon({ name, size = 20, strokeWidth = 1.85, className }) {
  const d = ICONS[name];
  if (!d) return null;
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}
