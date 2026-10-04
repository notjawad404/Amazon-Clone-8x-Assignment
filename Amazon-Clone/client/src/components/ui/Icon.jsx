const PATHS = {
  search: ['M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z', 'M20 20l-4-4'],
  menu: ['M4 6h16', 'M4 12h16', 'M4 18h16'],
  close: ['M6 6l12 12', 'M18 6 6 18'],
  'chevron-left': ['M15 6l-6 6 6 6'],
  'chevron-right': ['M9 6l6 6-6 6'],
  'chevron-down': ['M6 9l6 6 6-6'],
  location: [
    'M12 21s-7-6.2-7-11a7 7 0 1 1 14 0c0 4.8-7 11-7 11z',
    'M14.5 10a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z',
  ],
  cart: [
    'M2 4h2.5l2.6 10.4a1 1 0 0 0 1 .8h9.3a1 1 0 0 0 1-.8L20.5 7H5.3',
    'M10.5 19.5a1.25 1.25 0 1 1-2.5 0 1.25 1.25 0 0 1 2.5 0z',
    'M18 19.5a1.25 1.25 0 1 1-2.5 0 1.25 1.25 0 0 1 2.5 0z',
  ],
  user: ['M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'M4 20a8 8 0 0 1 16 0'],
  lock: ['M6 11h12v9H6z', 'M8.5 11V8a3.5 3.5 0 0 1 7 0v3'],
  trash: ['M4 7h16', 'M10 11v6', 'M14 11v6', 'M6 7l1 13h10l1-13', 'M9 7V4h6v3'],
  plus: ['M12 5v14', 'M5 12h14'],
  minus: ['M5 12h14'],
  check: ['M5 12.5l4.5 4.5L19 7'],
}

export default function Icon({ name, className = 'size-5', strokeWidth = 2 }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className}`}
    >
      {PATHS[name].map((path) => (
        <path key={path} d={path} />
      ))}
    </svg>
  )
}
