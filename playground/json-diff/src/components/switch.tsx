interface SwitchProps {
  checked: boolean
  onChange: () => void
  className?: string
}

export default function Switch(props: SwitchProps) {
  const base =
    'relative inline-flex h-5 w-10 items-center rounded-full transition-all duration-300 ease-out'
  const active = props.checked
    ? 'bg-[var(--theme-btn-primary)] justify-end shadow-lg shadow-[var(--theme-btn-primary)]/30'
    : 'bg-[var(--theme-border-strong)] justify-start shadow-inner'
  const className = `${base} ${active} ${props.className || ''}`

  return (
    <button
      aria-label="switch"
      role="switch"
      aria-checked={props.checked}
      onClick={props.onChange}
      className={className}
    >
      <span
        className={`
          h-4 w-4 rounded-full bg-white shadow-md
          transform transition-transform duration-300 ease-out
          flex items-center justify-center
          ${props.checked ? 'translate-x-0.5' : 'translate-x-0.5'}
        `}
      >
        {props.checked ? (
          <svg
            className="w-3 h-3 text-[var(--theme-btn-primary)]"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-3.791l-.168-.527-.877.439a1 1 0 00-.554 1.83l.622.933a1 1 0 01.286 1.052l-1.178 4.686a3.99 3.99 0 01-3.691 3.1H8a1 1 0 01-1-1v-2.924a3.99 3.99 0 01-.5-2.07L4.5 12.5l-.422-.211A1 1 0 003 13.05a1 1 0 00-.5 1.79l.8 1.511a1 1 0 01.285 1.05l-1.178 4.686a3.99 3.99 0 01-3.691 3.1H2a1 1 0 01-1-1v-2.924a3.99 3.99 0 01.5-2.07L2.5 8.5l.422-.211A1 1 0 002.5 7.79l-.877.439a1 1 0 00-.554 1.83l.622.933a1 1 0 01.286 1.052l-1.178 4.686a3.99 3.99 0 01-3.691 3.1H2.5a1 1 0 01-1-1V5a1 1 0 011-1h7.5z" />
          </svg>
        ) : (
          <svg
            className="w-3 h-3 text-gray-400"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-3.791l-.168-.527-.877.439a1 1 0 00-.554 1.83l.622.933a1 1 0 01.286 1.052l-1.178 4.686a3.99 3.99 0 01-3.691 3.1H8a1 1 0 01-1-1v-2.924a3.99 3.99 0 01.5-2.07L4.5 12.5l-.422-.211A1 1 0 003 13.05a1 1 0 00-.5 1.79l.8 1.511a1 1 0 01.285 1.05l-1.178 4.686a3.99 3.99 0 01-3.691 3.1H2a1 1 0 01-1-1v-2.924a3.99 3.99 0 01.5-2.07L2.5 8.5l.422-.211A1 1 0 002.5 7.79l-.877.439a1 1 0 00-.554 1.83l.622.933a1 1 0 01.286 1.052l-1.178 4.686a3.99 3.99 0 01-3.691 3.1H2.5a1 1 0 01-1-1V5a1 1 0 011-1h7.5z" />
          </svg>
        )}
      </span>
    </button>
  )
}
