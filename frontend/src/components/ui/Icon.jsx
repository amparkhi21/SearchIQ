/** Minimal inline icon set (24px grid, stroke icons) — avoids an icon-library dependency. */
const PATHS = {
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm10 2-4.3-4.3',
  heart: 'M12 21s-7.5-4.6-9.4-9.2C1.3 8.6 3 5 6.4 5c2 0 3.6 1.1 4.6 2.7h2C14 6.1 15.600 5 17.600 5 21 5 22.700 8.600 21.400 11.800 19.500 16.400 12 21 12 21Z',
  cart: 'M3 4h2.2l2.1 10.2a1.500 1.500 0 0 0 1.500 1.200h8.400a1.500 1.500 0 0 0 1.500-1.100L20.500 8H6M9 20a1 1 0 1 0 0-.01M17 20a1 1 0 1 0 0-.01',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-8 9a8 8 0 0 1 16 0',
  bell: 'M6 9a6 6 0 1 1 12 0c0 6 2.500 7.500 2.500 7.500h-17S6 15 6 9Zm4 10.500a2.200 2.200 0 0 0 4 0',
  box: 'M21 8 12 3 3 8m18 0v8l-9 5m9-13-9 5m0 8-9-5V8m9 5v8M7.500 5.500l9 5',
  menu: 'M4 6h16M4 12h16M4 18h16',
  close: 'M6 6l12 12M18 6 6 18',
  chevronDown: 'm6 9 6 6 6-6',
  chevronRight: 'm9 6 6 6-6 6',
  chevronLeft: 'm15 6-6 6 6 6',
  filter: 'M3 5h18l-7 8v6l-4 2v-8L3 5Z',
  star: 'm12 3 2.800 5.700 6.200.900-4.500 4.400 1.100 6.200L12 17.200 6.400 20.200l1.100-6.200L3 9.600l6.200-.9L12 3Z',
  sparkles: 'M12 3l1.800 4.700L18.500 9.500 13.800 11.300 12 16l-1.800-4.700L5.500 9.500l4.700-1.800L12 3Zm7 11 .9 2.100L22 17l-2.100.9L19 20l-.9-2.100L16 17l2.100-.9L19 14ZM5 15l.7 1.600L7.300 17l-1.600.7L5 19.300l-.7-1.600L2.700 17l1.600-.4L5 15Z',
  truck: 'M2 6h11v10H2zM13 9h4l4 3.500V16h-8M6 19a1.800 1.800 0 1 0 0-.01M17 19a1.800 1.800 0 1 0 0-.01',
  shield: 'M12 3 4 6v6c0 4.500 3.200 8 8 9 4.800-1 8-4.500 8-9V6l-8-3Zm-3 9 2.200 2.200L15.500 10',
  refresh: 'M20 11a8 8 0 0 0-14.500-3.500M4 4v4h4M4 13a8 8 0 0 0 14.500 3.500M20 20v-4h-4',
  trash: 'M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13M10 11v6m4-6v6',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  check: 'm5 12.500 4.500 4.500L19 7.500',
  eye: 'M2 12s3.600-7 10-7 10 7 10 7-3.600 7-10 7S2 12 2 12Zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  eyeOff: 'M3 3l18 18M10.600 6.100A9.800 9.800 0 0 1 12 6c6.400 0 10 6 10 6a17 17 0 0 1-3.200 3.800M6.300 7.800C3.700 9.600 2 12 2 12s3.600 6 10 6c1.500 0 2.800-.3 4-.8M9.900 9.900a3 3 0 0 0 4.200 4.200',
  logout: 'M9 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4m6-4 4-4-4-4m4 4H9',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  chart: 'M4 20V4m0 16h16M8 16v-5m4 5V8m4 8v-3',
  layers: 'm12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5m-18 4 9 5 9-5',
  tag: 'M3 12V4h8l10 10-8 8L3 12Zm5-4.500h.01',
  alert: 'M12 3 2 20h20L12 3Zm0 7v4m0 3h.01',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-10v5m0-8h.01',
  edit: 'M4 20h4L19 9l-4-4L4 16v4Zm9.500-13.500 4 4',
  map: 'M12 21s7-6.200 7-11.500A7 7 0 0 0 5 9.500C5 14.800 12 21 12 21Zm0-8.500a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-14v5l3 2',
  arrowRight: 'M5 12h14m-6-6 6 6-6 6',
  home: 'm3 11 9-8 9 8M5 10v10h5v-6h4v6h5V10',
  lock: 'M6 11h12v9H6zM8 11V8a4 4 0 0 1 8 0v3',
  card: 'M3 6h18v12H3zM3 10h18',
  bolt: 'M13 3 5 13h6l-1 8 8-10h-6l1-8Z',
  trendUp: 'm3 17 6-6 4 4 8-8m0 0h-5m5 0v5',
  package: 'M3 8 12 3l9 5v8l-9 5-9-5V8Zm0 0 9 5m0 0 9-5m-9 5v8',
  users: 'M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1m13-9a3 3 0 1 0 0-6m5 15v-1a4 4 0 0 0-3-3.800M9.500 10a3.500 3.500 0 1 0 0-7 3.500 3.500 0 0 0 0 7Z',
  external: 'M14 4h6v6m0-6-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5',
};

export default function Icon({ name, className = 'h-5 w-5', filled = false, strokeWidth = 1.8, ...rest }) {
  const d = PATHS[name];
  if (!d) return null;
  return (
    <svg
      viewBox="0 0 24 24"
      className={`shrink-0 ${className}`}
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      <path d={d} />
    </svg>
  );
}
