import type { SVGProps } from 'react';

export type IconName =
  | 'heart'
  | 'gift'
  | 'clock'
  | 'check'
  | 'checkCircle'
  | 'close'
  | 'chevronDown'
  | 'chevronRight'
  | 'chevronLeft'
  | 'arrowRight'
  | 'search'
  | 'map'
  | 'pin'
  | 'home'
  | 'bell'
  | 'user'
  | 'users'
  | 'settings'
  | 'logout'
  | 'plus'
  | 'minus'
  | 'box'
  | 'truck'
  | 'qr'
  | 'star'
  | 'award'
  | 'trophy'
  | 'shield'
  | 'chart'
  | 'fire'
  | 'wifi'
  | 'wifiOff'
  | 'share'
  | 'copy'
  | 'sound'
  | 'soundOff'
  | 'globe'
  | 'phone'
  | 'mail'
  | 'list'
  | 'info'
  | 'alert'
  | 'spark'
  | 'trendUp'
  | 'trendDown'
  | 'calendar'
  | 'location'
  | 'download'
  | 'activity'
  | 'book'
  | 'leaf'
  | 'lightbulb'
  | 'paw'
  | 'palette'
  | 'cpu'
  | 'upload'
  | 'image';

const PATHS: Record<IconName, string> = {
  heart: 'M12 21s-7.5-4.6-10-9C.5 9 1.7 5 5.5 5 8 5 9.5 7 12 9c2.5-2 4-4 6.5-4C22.3 5 23.5 9 22 12c-2.5 4.4-10 9-10 9z',
  gift: 'M20 12v9H4v-9M2 7h20v5H2zM12 22V7M12 7S11 2 7.5 2 5 6 12 7zM12 7s1-5 4.5-5S19 6 12 7z',
  clock: 'M12 7v5l3 2M12 22a10 10 0 110-20 10 10 0 010 20z',
  check: 'M5 13l4 4L19 7',
  checkCircle: 'M9 12l2 2 4-4M12 22a10 10 0 110-20 10 10 0 010 20z',
  close: 'M6 6l12 12M18 6L6 18',
  chevronDown: 'M6 9l6 6 6-6',
  chevronRight: 'M9 6l6 6-6 6',
  chevronLeft: 'M15 6l-6 6 6 6',
  arrowRight: 'M5 12h14M13 5l7 7-7 7',
  search: 'M21 21l-4.3-4.3M11 19a8 8 0 110-16 8 8 0 010 16z',
  map: 'M9 4L3 7v13l6-3 6 3 6-3V4l-6 3-6-3zM9 4v13M15 7v13',
  pin: 'M12 22s7-7 7-12a7 7 0 10-14 0c0 5 7 12 7 12zM12 12a2.5 2.5 0 100-5 2.5 2.5 0 000 5z',
  home: 'M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10',
  bell: 'M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0',
  user: 'M20 21a8 8 0 10-16 0M12 11a4 4 0 100-8 4 4 0 000 8z',
  users: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.9M16 3.1a4 4 0 010 7.8',
  settings:
    'M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.6 1.6 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.6 1.6 0 00-2.7 1.1V21a2 2 0 11-4 0v-.1A1.6 1.6 0 005 19.4l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.6 1.6 0 00-1.1-2.7H1a2 2 0 110-4h.1A1.6 1.6 0 002.6 5l-.1-.1a2 2 0 112.8-2.8l.1.1a1.6 1.6 0 001.8.3H9a1.6 1.6 0 001-1.5V1a2 2 0 114 0v.1a1.6 1.6 0 001 1.5 1.6 1.6 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.6 1.6 0 00-.3 1.8V9a1.6 1.6 0 001.5 1H23a2 2 0 110 4h-.1a1.6 1.6 0 00-1.5 1z',
  logout: 'M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  box: 'M21 16V8l-9-5-9 5v8l9 5 9-5zM3.3 7L12 12l8.7-5M12 22V12',
  truck: 'M1 3h15v13H1zM16 8h4l3 3v5h-7M5.5 21a2 2 0 100-4 2 2 0 000 4zM18.5 21a2 2 0 100-4 2 2 0 000 4z',
  qr: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h3v3h-3zM21 14v3M14 21h7M21 18v3',
  star: 'M12 2l3 6.5 7 .9-5 4.8 1.3 7L12 18l-6.3 3.2L7 14.2 2 9.4l7-.9L12 2z',
  award: 'M12 15a6 6 0 100-12 6 6 0 000 12zM8.2 13.9L7 22l5-3 5 3-1.2-8.1',
  trophy: 'M6 4h12v4a6 6 0 01-12 0V4zM6 6H3v2a3 3 0 003 3M18 6h3v2a3 3 0 01-3 3M9 18h6M10 18v-3M14 18v-3M8 22h8',
  shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  chart: 'M3 3v18h18M7 14v4M12 9v9M17 5v13',
  fire: 'M12 22a7 7 0 007-7c0-3-2-5-3-7-.5 1.5-2 2-2 2 0-3-2-5-4-7 0 4-4 5-4 9a6 6 0 006 6z',
  wifi: 'M5 12.5a10 10 0 0114 0M8.5 16a5 5 0 017 0M12 20h.01',
  wifiOff: 'M2 2l20 20M8.5 16a5 5 0 016.3-.6M5 12.5a10 10 0 015-2.7M16.7 10a10 10 0 012.3 1.6M12 20h.01',
  share: 'M4 12v8h16v-8M16 6l-4-4-4 4M12 2v14',
  copy: 'M9 9h11v11H9zM5 15H4V4h11v1',
  sound: 'M11 5L6 9H2v6h4l5 4V5zM15.5 8.5a5 5 0 010 7M19 5a9 9 0 010 14',
  soundOff: 'M11 5L6 9H2v6h4l5 4V5zM22 9l-6 6M16 9l6 6',
  globe: 'M12 22a10 10 0 100-20 10 10 0 000 20zM2 12h20M12 2a15 15 0 010 20 15 15 0 010-20z',
  phone: 'M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3 19.5 19.5 0 01-6-6 19.8 19.8 0 01-3-8.6A2 2 0 014.1 2h3a2 2 0 012 1.7c.1 1 .4 1.9.7 2.8a2 2 0 01-.5 2.1L8.1 9.9a16 16 0 006 6l1.3-1.3a2 2 0 012.1-.4c.9.3 1.8.6 2.8.7a2 2 0 011.7 2z',
  mail: 'M4 4h16v16H4zM4 6l8 6 8-6',
  list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  info: 'M12 16v-4M12 8h.01M12 22a10 10 0 110-20 10 10 0 010 20z',
  alert: 'M12 9v4M12 17h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z',
  spark: 'M12 2v6M12 16v6M2 12h6M16 12h6M5 5l3 3M16 16l3 3M19 5l-3 3M8 16l-3 3',
  trendUp: 'M23 6l-9.5 9.5-5-5L1 18M17 6h6v6',
  trendDown: 'M23 18l-9.5-9.5-5 5L1 6M17 18h6v-6',
  calendar: 'M3 5h18v16H3zM3 9h18M8 3v4M16 3v4',
  location: 'M12 11a3 3 0 100-6 3 3 0 000 6zM12 2a7 7 0 017 7c0 5-7 13-7 13S5 14 5 9a7 7 0 017-7z',
  download: 'M12 3v12M7 10l5 5 5-5M5 21h14',
  upload: 'M12 21V9M7 14l5-5 5 5M5 3h14',
  image: 'M3 5h18v14H3zM3 16l5-5 4 4 3-3 6 6',
  activity: 'M22 12h-4l-3 9L9 3l-3 9H2',
  book: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4.5z',
  leaf: 'M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10zM2 22c1.5-5 5-9 9-11',
  lightbulb: 'M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.3h6c0-1 .4-1.8 1-2.3A7 7 0 0 0 12 2z',
  paw: 'M12 13c2.5 0 4 1.9 4 3.6S14.5 21 12 21s-4-1.7-4-3.4S9.5 13 12 13zM6.5 11a1.7 1.7 0 1 0 0-3.4 1.7 1.7 0 0 0 0 3.4zM17.5 11a1.7 1.7 0 1 0 0-3.4 1.7 1.7 0 0 0 0 3.4zM9.5 7.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM14.5 7.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z',
  palette: 'M12 22a10 10 0 1 1 10-10c0 2-2 3-4 3h-2a2 2 0 0 0-1.5 3.3A2 2 0 0 1 12 22zM8.5 9.5h.01M12 7h.01M15.5 9.5h.01',
  cpu: 'M6 6h12v12H6zM9 9h6v6H9zM9 2v2M15 2v2M9 20v2M15 20v2M2 9h2M2 15h2M20 9h2M20 15h2',
};

interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName;
  size?: number;
}

export function Icon({ name, size = 20, strokeWidth = 2, ...rest }: IconProps & { strokeWidth?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
