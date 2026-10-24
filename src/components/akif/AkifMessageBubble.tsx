import styles from './AkifMessageBubble.module.css'
import { useReducedMotion } from './useReducedMotion'

export interface AkifMessageBubbleProps {
  role: 'user' | 'akif'
  content: string
}

export function AkifMessageBubble({ role, content }: AkifMessageBubbleProps) {
  const reduced = useReducedMotion()
  const cls = [styles.bubble, role === 'user' ? styles.user : styles.akif, reduced ? '' : styles.enter]
    .filter(Boolean)
    .join(' ')
  return (
    <div className={styles.row} data-role={role}>
      {role === 'akif' && <span className={styles.avatar} aria-hidden="true">A</span>}
      <div className={cls}>{content}</div>
    </div>
  )
}
