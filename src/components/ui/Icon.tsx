import type { SVGProps } from "react";

/**
 * Single inline SVG icon set (no icon dependency, no network requests).
 * Stroke-based, 24px grid, inherits `currentColor`.
 */
const PATHS = {
  cart: <><circle cx="9" cy="20" r="1.4" /><circle cx="18" cy="20" r="1.4" /><path d="M2.5 3.5h2.2l2.1 10.2a1.6 1.6 0 0 0 1.6 1.3h8.4a1.6 1.6 0 0 0 1.6-1.3L20.5 7H6" /></>,
  heart: <path d="M12 20.3s-7.6-4.5-9.1-9A5.1 5.1 0 0 1 12 6.6a5.1 5.1 0 0 1 9.1 4.7c-1.5 4.5-9.1 9-9.1 9Z" />,
  share: <><circle cx="18" cy="5" r="2.4" /><circle cx="6" cy="12" r="2.4" /><circle cx="18" cy="19" r="2.4" /><path d="m8.2 10.8 7.6-4.4M8.2 13.2l7.6 4.4" /></>,
  compare: <><path d="M12 3v18M6 8H3l3 6 3-6H6ZM18 8h-3l3 6 3-6h-3Z" /></>,
  star: <path d="m12 3.6 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9L12 3.6Z" />,
  chevronDown: <path d="m6 9 6 6 6-6" />,
  chevronUp: <path d="m6 15 6-6 6 6" />,
  chevronLeft: <path d="m15 6-6 6 6 6" />,
  chevronRight: <path d="m9 6 6 6-6 6" />,
  arrowLeft: <><path d="M19 12H5" /><path d="m11 6-6 6 6 6" /></>,
  arrowRight: <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  zoomIn: <><circle cx="11" cy="11" r="6.5" /><path d="M11 8.5v5M8.5 11h5M16 16l4.5 4.5" /></>,
  zoomOut: <><circle cx="11" cy="11" r="6.5" /><path d="M8.5 11h5M16 16l4.5 4.5" /></>,
  zoomReset: <><path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1" /><path d="M3.5 4.5V10H9" /></>,
  truck: <><path d="M2.5 6.5h11v10h-11z" /><path d="M13.5 10h4l3 3v3.5h-7z" /><circle cx="7" cy="18" r="1.7" /><circle cx="17" cy="18" r="1.7" /></>,
  shield: <><path d="M12 3 5 5.8v5.4c0 4.3 2.9 8 7 9.3 4.1-1.3 7-5 7-9.3V5.8L12 3Z" /><path d="m9.2 12 2 2 3.6-3.8" /></>,
  rotate: <><path d="M3.5 12a8.5 8.5 0 1 1 2.6 6.1" /><path d="M3.5 19.5V14H9" /></>,
  lock: <><rect x="4.5" y="10.5" width="15" height="10" rx="2" /><path d="M8 10.5V7.8a4 4 0 0 1 8 0v2.7" /><path d="M12 14.5v2.5" /></>,
  headset: <><path d="M4 13.5V12a8 8 0 0 1 16 0v1.5" /><rect x="2.5" y="13" width="4" height="6" rx="1.6" /><rect x="17.5" y="13" width="4" height="6" rx="1.6" /><path d="M20 19v.6a2.4 2.4 0 0 1-2.4 2.4H13" /></>,
  badgeCheck: <><path d="m12 2.8 2.3 1.7 2.8-.2 1 2.7 2.4 1.5-.8 2.7.8 2.7-2.4 1.5-1 2.7-2.8-.2L12 21.2l-2.3-1.7-2.8.2-1-2.7L3.5 15.5l.8-2.7-.8-2.7 2.4-1.5 1-2.7 2.8.2L12 2.8Z" /><path d="m9.2 12.2 2 2 3.6-4" /></>,
  flame: <path d="M12 21c3.6 0 6-2.4 6-5.6 0-4-3.3-5.6-3-9.4-2 .8-3.4 2.4-3.4 4.4 0 1.2.5 2 .5 2.6 0 .9-.7 1.5-1.5 1.5-1 0-1.7-.9-1.7-2.3C7.5 13.5 6 14.7 6 17c0 2.3 2.2 4 6 4Z" />,
  tag: <><path d="M3.5 11.4V4.5a1 1 0 0 1 1-1h6.9a1 1 0 0 1 .7.3l8 8a1 1 0 0 1 0 1.4l-6.9 6.9a1 1 0 0 1-1.4 0l-8-8a1 1 0 0 1-.3-.7Z" /><circle cx="8" cy="8" r="1.4" /></>,
  clock: <><circle cx="12" cy="12" r="8.8" /><path d="M12 7v5.3l3.2 2" /></>,
  gift: <><rect x="3.2" y="8.5" width="17.6" height="4" rx="1" /><path d="M5 12.5V20h14v-7.5M12 8.5V20" /><path d="M12 8.5S10.8 4 8.6 4a2.2 2.2 0 0 0 0 4.5H12Zm0 0s1.2-4.5 3.4-4.5a2.2 2.2 0 0 1 0 4.5H12Z" /></>,
  ticket: <><path d="M3.5 8.5A1.5 1.5 0 0 1 5 7h14a1.5 1.5 0 0 1 1.5 1.5v2a2.5 2.5 0 0 0 0 5v2A1.5 1.5 0 0 1 19 19H5a1.5 1.5 0 0 1-1.5-1.5v-2a2.5 2.5 0 0 0 0-5v-2Z" /><path d="M14 7v12" strokeDasharray="2 2.4" /></>,
  mapPin: <><path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z" /><circle cx="12" cy="10" r="2.6" /></>,
  store: <><path d="M4 10v9.5h16V10" /><path d="M2.8 10 5 4h14l2.2 6a3 3 0 0 1-5.4 1.8A3 3 0 0 1 12 12a3 3 0 0 1-3.8-.2A3 3 0 0 1 2.8 10Z" /><path d="M10 19.5v-5h4v5" /></>,
  sparkles: <><path d="m12 3 1.7 4.3L18 9l-4.3 1.7L12 15l-1.7-4.3L6 9l4.3-1.7L12 3Z" /><path d="m18.5 15 .9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9.9-2.1Z" /></>,
  alert: <><path d="M12 4.2 2.8 20h18.4L12 4.2Z" /><path d="M12 10v4.2M12 17.2h.01" /></>,
  info: <><circle cx="12" cy="12" r="8.8" /><path d="M12 11v5.5M12 7.8h.01" /></>,
  check: <path d="m5 12.5 4.5 4.5L19 7" />,
  search: <><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></>,
  user: <><circle cx="12" cy="8.2" r="3.7" /><path d="M4.8 20a7.2 7.2 0 0 1 14.4 0" /></>,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  package: <><path d="m12 2.8 8.5 4.4v9.6L12 21.2 3.5 16.8V7.2L12 2.8Z" /><path d="M3.7 7.3 12 11.7l8.3-4.4M12 11.7v9.4" /></>,
  card: <><rect x="2.5" y="5" width="19" height="14" rx="2.4" /><path d="M2.5 9.8h19M6 15h3.5" /></>,
  wallet: <><path d="M3.5 7.5A2 2 0 0 1 5.5 5.5h11a2 2 0 0 1 2 2v1" /><rect x="3.5" y="7.5" width="17" height="11.5" rx="2" /><path d="M16.5 13.2h1.8" /></>,
  message: <path d="M20.5 12.2c0 4-3.8 7.2-8.5 7.2a9.9 9.9 0 0 1-2.6-.3L4.5 21l1.2-3.4A6.8 6.8 0 0 1 3.5 12.2C3.5 8.2 7.3 5 12 5s8.5 3.2 8.5 7.2Z" />,
  refresh: <><path d="M20.5 12a8.5 8.5 0 1 1-2.6-6.1" /><path d="M20.5 4.5V10H15" /></>,
  thumbUp: <><path d="M7 10.5v9H4.5a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1H7Z" /><path d="M7 10.5 11.4 3a2.3 2.3 0 0 1 2.3 2.3V9h4.6a2 2 0 0 1 2 2.4l-1.2 6A2 2 0 0 1 17.1 19H7" /></>,
  filter: <path d="M3.5 5.5h17l-6.6 7.6v5.6l-3.8 2v-7.6L3.5 5.5Z" />,
  sort: <><path d="M7 4.5v15M7 19.5 4 16.5M7 19.5l3-3" /><path d="M17 19.5v-15M17 4.5l-3 3M17 4.5l3 3" /></>,
  eye: <><path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12Z" /><circle cx="12" cy="12" r="3" /></>,
  eyeOff: <><path d="M3.5 3.5 20.5 20.5" /><path d="M9.9 5.1A10.7 10.7 0 0 1 12 4.9c6 0 9.5 7.1 9.5 7.1s-1 1.9-2.9 3.7M6.4 6.4C4 8.1 2.5 11 2.5 12s3.5 7.1 9.5 7.1c1.6 0 3-.4 4.2-1" /><path d="M9.5 9.6a3 3 0 0 0 4.2 4.2" /></>,
  grid: <><rect x="3.5" y="3.5" width="7" height="7" rx="1.4" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.4" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.4" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.4" /></>,
  move: <><path d="M12 3v18M3 12h18" /><path d="m12 3-2 2.2M12 3l2 2.2M12 21l-2-2.2M12 21l2-2.2M3 12l2.2-2M3 12l2.2 2M21 12l-2.2-2M21 12l-2.2 2" /></>,
  copy: <><rect x="8.5" y="8.5" width="12" height="12" rx="2" /><path d="M15.5 5.5v-1a1 1 0 0 0-1-1h-10a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h1" /></>,
  bolt: <path d="M13.5 2.5 4.8 13.2h5.4L9.9 21.5l8.9-10.9h-5.6l.3-8.1Z" />,
  phone: <><path d="M7.2 3.5H4.8A1.8 1.8 0 0 0 3 5.4c0 8.4 6.9 15.3 15.3 15.3a1.8 1.8 0 0 0 1.9-1.8v-2.4l-4.2-1.6-1.9 2a13.6 13.6 0 0 1-5.4-5.4l2-1.9L7.2 3.5Z" /></>,
  camera: <><path d="M3.5 8.8A1.8 1.8 0 0 1 5.3 7h2l1.3-2.2h6.8L16.7 7h2A1.8 1.8 0 0 1 20.5 8.8v9.4a1.8 1.8 0 0 1-1.8 1.8H5.3a1.8 1.8 0 0 1-1.8-1.8V8.8Z" /><circle cx="12" cy="13" r="3.6" /></>,
  scale: <><path d="M12 4v16M6 20h12" /><path d="M4 9h4l-2 4.5L4 9ZM16 9h4l-2 4.5L16 9Z" /><path d="M4 9 12 6.5 20 9" /></>,
  layers: <><path d="m12 3 8.5 4.4L12 11.8 3.5 7.4 12 3Z" /><path d="m3.5 12.2 8.5 4.4 8.5-4.4M3.5 16.6 12 21l8.5-4.4" /></>,
  droplet: <path d="M12 3.2s5.8 6 5.8 9.6a5.8 5.8 0 1 1-11.6 0C6.2 9.2 12 3.2 12 3.2Z" />,

  home: <><path d="M4 10.6 12 4l8 6.6V20a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1v-9.4Z" /></>,
  building: <><path d="M4.5 20.5V4.5a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v16" /><path d="M13.5 9.5h5a1 1 0 0 1 1 1v10" /><path d="M7.5 7.5h3M7.5 11h3M7.5 14.5h3M16 13.5h1.2M16 17h1.2M3 20.5h18" /></>,
  gauge: <><path d="M12 13.5 15.5 9" /><path d="M4 18a9 9 0 1 1 16 0" /><circle cx="12" cy="18" r="1.2" /></>,
  snow: <><path d="M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9" /><path d="m12 6.4 2.2-2.2M12 6.4 9.8 4.2M12 17.6l2.2 2.2M12 17.6l-2.2 2.2" /></>,
  waves: <><path d="M2.5 8.2c2 0 2.6-1.6 4.6-1.6s2.6 1.6 4.6 1.6 2.6-1.6 4.6-1.6 2.6 1.6 5.2 1.6" /><path d="M2.5 13c2 0 2.6-1.6 4.6-1.6s2.6 1.6 4.6 1.6 2.6-1.6 4.6-1.6 2.6 1.6 5.2 1.6" /><path d="M2.5 17.8c2 0 2.6-1.6 4.6-1.6s2.6 1.6 4.6 1.6 2.6-1.6 4.6-1.6 2.6 1.6 5.2 1.6" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 14.6a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 0 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2 2 2 0 0 1-4 0 1.7 1.7 0 0 0-2.9-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0-1.2-2.9 2 2 0 0 1 0-4 1.7 1.7 0 0 0 1.2-2.9l-.1-.1a2 2 0 0 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 2.9-1.2 2 2 0 0 1 4 0 1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0 1.2 2.9 2 2 0 0 1 0 4 1.7 1.7 0 0 0-1.5 1.2Z" /></>,
  wrench: <path d="M15.6 4.2a5.4 5.4 0 0 0-6.9 6.6L3.4 16.1a1.9 1.9 0 0 0 2.7 2.7l5.3-5.3a5.4 5.4 0 0 0 6.6-6.9l-3 3-2.6-2.6 3.2-2.8Z" />,
  calendar: <><rect x="3.5" y="5.5" width="17" height="15" rx="2" /><path d="M3.5 10h17M8 3.5v4M16 3.5v4" /></>,
  trash: <><path d="M4.5 7h15M9 7V5.2a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1V7" /><path d="M6.5 7l.8 12a1.6 1.6 0 0 0 1.6 1.5h6.2a1.6 1.6 0 0 0 1.6-1.5L17.5 7" /><path d="M10.5 11v6M13.5 11v6" /></>,
  edit: <><path d="M16.7 4.6a2 2 0 0 1 2.8 2.8L8.3 18.6l-3.8.9.9-3.8L16.7 4.6Z" /><path d="m15.2 6.1 2.7 2.7" /></>,
  whatsapp: <><path d="M12 3.6a8.3 8.3 0 0 0-7.1 12.6L3.7 20.4l4.3-1.2A8.3 8.3 0 1 0 12 3.6Z" /><path d="M9 9.2c0 3 2.4 5.4 5.4 5.4.6 0 1.1-.5 1.1-1.1l-1-1-1.2.6-2.3-2.3.6-1.2-1-1c-.6 0-1.1.5-1.1 1.1Z" /></>,
  navigation: <path d="M20.5 3.5 3.9 10.3c-.6.2-.6 1 0 1.2l6.6 2.3 2.3 6.6c.2.6 1 .6 1.2 0L20.5 3.5Z" />,
  logout: <><path d="M14.5 4.5h3a1.5 1.5 0 0 1 1.5 1.5v12a1.5 1.5 0 0 1-1.5 1.5h-3" /><path d="M9.5 8 5.5 12l4 4M5.5 12H15" /></>,
  login: <><path d="M9.5 4.5h-3A1.5 1.5 0 0 0 5 6v12a1.5 1.5 0 0 0 1.5 1.5h3" /><path d="m14.5 8 4 4-4 4M18.5 12H9" /></>,
  dashboard: <><rect x="3.5" y="3.5" width="7" height="7" rx="1.6" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.6" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.6" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.6" /></>,
  list: <><path d="M8.5 6.5h12M8.5 12h12M8.5 17.5h12" /><circle cx="4.6" cy="6.5" r="1.2" /><circle cx="4.6" cy="12" r="1.2" /><circle cx="4.6" cy="17.5" r="1.2" /></>,
  percent: <><path d="M18.5 5.5 5.5 18.5" /><circle cx="7.5" cy="7.5" r="2.3" /><circle cx="16.5" cy="16.5" r="2.3" /></>,
  trendUp: <><path d="M3.5 17.5 9.5 11l3.5 3.5 7.5-7.5" /><path d="M15 7h5.5v5.5" /></>,
  checkCircle: <><circle cx="12" cy="12" r="8.6" /><path d="m8.4 12.3 2.4 2.4 4.8-5" /></>,
  xCircle: <><circle cx="12" cy="12" r="8.6" /><path d="m9.3 9.3 5.4 5.4M14.7 9.3l-5.4 5.4" /></>,
  download: <><path d="M12 4v10.5M8 11l4 4 4-4" /><path d="M4.5 19.5h15" /></>,
  file: <><path d="M13.5 3.5H7a1.5 1.5 0 0 0-1.5 1.5v14A1.5 1.5 0 0 0 7 20.5h10a1.5 1.5 0 0 0 1.5-1.5V8.5l-5-5Z" /><path d="M13.5 3.5V8.5h5" /></>,
  clipboard: <><rect x="5" y="4.5" width="14" height="16" rx="2" /><path d="M9 4.5V3.4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1V4.5" /><path d="M8.5 10h7M8.5 13.5h7M8.5 17h4" /></>,
  bell: <><path d="M18 15.5V11a6 6 0 1 0-12 0v4.5L4.5 18h15L18 15.5Z" /><path d="M10 20.5a2.2 2.2 0 0 0 4 0" /></>,
  ruler: <><rect x="2.6" y="8.4" width="18.8" height="7.2" rx="1.6" /><path d="M7 8.4v2.6M10.5 8.4v3.6M14 8.4v2.6M17.5 8.4v3.6" /></>,
  recycle: <><path d="M8.4 5.4 12 3l3.6 2.4M6.2 9.6 4.4 13.2l2 3.4M17.8 9.6l1.8 3.6-2 3.4" /><path d="M3.2 16.6h4M12 21l-2-3.4h4L12 21ZM20.8 16.6h-4" /></>,
  video: <><rect x="2.6" y="6" width="13" height="12" rx="2.2" /><path d="m15.6 12 5.8-3.4v6.8L15.6 12Z" /></>,
  target: <><circle cx="12" cy="12" r="8.6" /><circle cx="12" cy="12" r="4.6" /><circle cx="12" cy="12" r="1" /></>,
  send: <><path d="M4.2 12 20 4.6l-6.4 15.4-2.2-6.2-6.2-2.4Z" /><path d="m11.4 13.8 3.4-3.4" /></>,
  paperclip: <path d="M17.6 8.4l-7.3 7.3a3 3 0 1 1-4.2-4.2l8-8a4.6 4.6 0 0 1 6.5 6.5l-8.2 8.2a6.2 6.2 0 0 1-8.8-8.8l7.3-7.3" />,
  stop: <><circle cx="12" cy="12" r="8.6" /><rect x="9.2" y="9.2" width="5.6" height="5.6" rx="1.2" /></>,
  thumbDown: <><path d="M7 13.5v-9H4.5a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1H7Z" /><path d="M7 13.5 11.4 21a2.3 2.3 0 0 0 2.3-2.3V15h4.6a2 2 0 0 0 2-2.4l-1.2-6A2 2 0 0 0 17.1 5H7" /></>,
  image: <><rect x="3.5" y="4.5" width="17" height="15" rx="2" /><circle cx="9" cy="9.6" r="1.6" /><path d="m4.5 17.5 4.6-4.3 3.4 3 2.6-2.4 4.4 4" /></>,
  history: <><path d="M3.6 12a8.4 8.4 0 1 0 2.6-6.1" /><path d="M3.6 4.6v5.3h5.3" /><path d="M12 8.4V12l2.8 1.8" /></>,
  layersPlus: <><path d="m12 3 8.5 4.4L12 11.8 3.5 7.4 12 3Z" /><path d="m4.6 11.4-1.1.6 8.5 4.4 8.5-4.4-1.1-.6M4.6 15.6l-1.1.6 8.5 4.4 8.5-4.4-1.1-.6" /></>,
} as const;

export type IconName = keyof typeof PATHS;

interface IconProps extends Omit<SVGProps<SVGSVGElement>, "name"> {
  name: IconName;
  filled?: boolean;
  size?: number | string;
}

export function Icon({ name, filled = false, size = 20, className, strokeWidth = 1.6, ...rest }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={filled ? 0 : strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {PATHS[name]}
    </svg>
  );
}

export default Icon;
