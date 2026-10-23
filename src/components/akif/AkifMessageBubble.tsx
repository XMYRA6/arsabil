import styles from './AkifMessageBubble.module.css'

export interface AkifMessageBubbleProps {
  role: 'user' | 'akif'
  content: string
}

export function AkifMessageBubble({ role, content }: AkifMessageBubbleProps) {
  return (
    <div className={styles.row} data-role={role}>
      {role === 'akif' && <span className={styles.avatar} aria-hidden="true">A</span>}
      <div className={`${styles.bubble} ${role === 'user' ? styles.user : styles.akif}`}>{content}</div>
    </div>
  )
}
