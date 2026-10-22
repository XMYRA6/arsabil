import React, { KeyboardEvent } from 'react'
import styles from './SegmentedControl.module.css'

export interface SegmentedControlItem {
  value: string
  label: React.ReactNode
}

export interface SegmentedControlProps {
  ariaLabel: string
  items: SegmentedControlItem[]
  value: string
  onChange: (v: string) => void
  className?: string
}

export function SegmentedControl({ ariaLabel, items, value, onChange, className }: SegmentedControlProps) {
  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex: number | null = null

    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      nextIndex = (index + 1) % items.length
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      nextIndex = (index - 1 + items.length) % items.length
    }

    if (nextIndex !== null) {
      e.preventDefault()
      const nextValue = items[nextIndex].value
      onChange(nextValue)
      
      const container = e.currentTarget.parentElement
      if (container) {
        const nextRadio = container.children[nextIndex] as HTMLButtonElement
        if (nextRadio) {
          nextRadio.focus()
        }
      }
    }
  }

  return (
    <div role="radiogroup" aria-label={ariaLabel} className={[styles.container, className].filter(Boolean).join(' ')}>
      {items.map((item, index) => {
        const isSelected = item.value === value
        return (
          <button
            key={item.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            tabIndex={isSelected ? 0 : -1}
            className={[styles.item, isSelected && styles.selected].filter(Boolean).join(' ')}
            onClick={() => {
              if (!isSelected) {
                onChange(item.value)
              }
            }}
            onKeyDown={(e) => handleKeyDown(e, index)}
          >
            {item.label}
          </button>
        )
      })}
    </div>
  )
}
