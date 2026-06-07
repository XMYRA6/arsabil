import { useRef, useState } from 'react'
import styles from './wizard.module.css'
import { WizardFormData } from './types'
import { MAX_FILES_PER_LISTING } from '@/lib/upload'

interface Props {
  data: WizardFormData
  onChange: (patch: Partial<WizardFormData>) => void
  tempListingId: string
}

export function WizardStep3Photos({ data, onChange, tempListingId }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    const slots = MAX_FILES_PER_LISTING - data.photos.length
    if (slots <= 0) { setError(`En fazla ${MAX_FILES_PER_LISTING} fotoğraf yüklenebilir`); return }
    setUploading(true)
    setError('')
    const uploaded: string[] = []
    for (const file of Array.from(files).slice(0, slots)) {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('listingId', tempListingId)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      if (res.ok) {
        const { url } = await res.json()
        uploaded.push(url)
      } else {
        const { error: err } = await res.json()
        setError(err || 'Yükleme hatası')
      }
    }
    onChange({ photos: [...data.photos, ...uploaded] })
    setUploading(false)
  }

  return (
    <div className={styles.stepContainer}>
      <div
        className={styles.dropZone}
        onClick={() => inputRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); handleFiles(e.dataTransfer.files) }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          style={{ display: 'none' }}
          onChange={e => handleFiles(e.target.files)}
        />
        <p className={styles.dropZoneText}>
          {uploading
            ? 'Yükleniyor...'
            : <>{`Fotoğraf yüklemek için tıkla veya sürükle bırak`}<br /><small>{`Max ${MAX_FILES_PER_LISTING} görsel · JPG, PNG, WebP · 5MB/dosya`}</small></>
          }
        </p>
      </div>

      {error && <p className={styles.errorText}>{error}</p>}

      {data.photos.length > 0 && (
        <div className={styles.photoGrid}>
          {data.photos.map(url => (
            <div key={url} className={styles.photoItem}>
              <img src={url} alt="" className={styles.photoImg} />
              <button
                className={styles.photoRemove}
                onClick={() => onChange({ photos: data.photos.filter(p => p !== url) })}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <p className={styles.photoCount}>{data.photos.length}/{MAX_FILES_PER_LISTING} fotoğraf · Bu adımı atlayabilirsin</p>
    </div>
  )
}
