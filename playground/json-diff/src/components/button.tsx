import type { ReactNode } from 'react'

interface ButtonProps {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  className?: string
  variant?: 'primary' | 'secondary' | 'danger'
}

export default function Button(props: ButtonProps) {
  const variant = props.variant || 'primary'

  const baseStyles = `
    px-4 py-2 text-sm font-medium rounded-lg
    transition-all duration-200 ease-in-out
    border cursor-pointer
    flex items-center justify-center gap-1.5
    disabled:opacity-50 disabled:cursor-not-allowed
  `

  const variantStyles = {
    primary: `
      bg-[var(--theme-btn-primary)] text-white border-transparent
      hover:bg-[var(--theme-btn-hover)]
      active:bg-[var(--theme-btn-active)]
      shadow-md hover:shadow-lg
      transform hover:-translate-y-0.5 active:translate-y-0
    `,
    secondary: `
      bg-[var(--theme-bg-surface)] text-[var(--theme-text-primary)] border-[var(--theme-border)]
      hover:bg-[var(--theme-bg-muted)]
      active:bg-[var(--theme-border)]
      shadow-sm hover:shadow
      transform hover:-translate-y-0.5 active:translate-y-0
    `,
    danger: `
      bg-red-500 text-white border-transparent
      hover:bg-red-600
      active:bg-red-700
      shadow-md hover:shadow-lg
      transform hover:-translate-y-0.5 active:translate-y-0
    `,
  }

  const className = `${baseStyles} ${variantStyles[variant]} ${props.className || ''}`

  return (
    <button
      onClick={props.onClick}
      disabled={props.disabled}
      className={className}
    >
      {props.children}
    </button>
  )
}
