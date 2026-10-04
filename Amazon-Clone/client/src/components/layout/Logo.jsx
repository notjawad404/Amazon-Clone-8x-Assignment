import { APP_NAME } from '../../utils/constants'

const TONES = {
  light: { text: 'text-white', smile: 'text-accent' },
  dark: { text: 'text-ink', smile: 'text-btn-orange' },
}

export default function Logo({ tone = 'light' }) {
  const colors = TONES[tone]

  return (
    <span className={`relative inline-flex flex-col items-start leading-none ${colors.text}`}>
      <span className="text-2xl font-bold tracking-tight">{APP_NAME}</span>
      <svg
        aria-hidden="true"
        viewBox="0 0 100 12"
        className={`-mt-0.5 h-2 w-full ${colors.smile}`}
        fill="none"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
      >
        <path d="M3 3 Q50 14 92 4" />
        <path d="M84 2 L94 4 L89 11" />
      </svg>
    </span>
  )
}
