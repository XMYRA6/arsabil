import React, { ReactNode } from 'react'
import styles from './Button.module.css'

type Variant = 'primary' | 'secondary' | 'tertiary' | 'amber' | 'outline' | 'ghost'
type Size = 's' | 'm' | 'l'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  iconLeft?: ReactNode
  iconRight?: ReactNode
  fullWidth?: boolean
  className?: string
  children?: ReactNode
}

export function Button({
  variant = 'primary',
  size = 'm',
  iconLeft,
  iconRight,
  fullWidth = false,
  type = 'button',
  className,
  children,
  ...rest
}: ButtonProps) {
  const sizeClass = size === 's' ? styles.sizeS : size === 'l' ? styles.sizeL : styles.sizeM
  const variantClass = (() => {
    switch (variant) {
      case 'primary': return styles.primary
      case 'secondary':
      case 'outline': return styles.secondary
      case 'tertiary':
      case 'ghost': return styles.tertiary
      case 'amber': return styles.amber
      default: return styles.primary
    }
  })()
  
  const classes = [styles.button, variantClass, sizeClass, fullWidth && styles.fullWidth, className]
    .filter(Boolean)
    .join(' ')

  return (
    <button type={type} className={classes} {...rest}>
      {iconLeft && <span className={styles.iconLeft} aria-hidden="true">{iconLeft}</span>}
      {iconLeft || iconRight ? <span>{children}</span> : children}
      {iconRight && <span className={styles.iconRight} aria-hidden="true">{iconRight}</span>}
    </button>
  )
}
