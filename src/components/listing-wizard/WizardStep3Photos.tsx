import { useRef, useState } from 'react'
import styles from './wizard.module.css'
import { WizardFormData } from './types'
import { MAX_FILES_PER_LISTING, publicIdFromUrl } from '@/lib/upload'

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
    const uploaded: { url: string; publicId: string }[] = []
    for (const file of Array.from(files).slice(0, slots)) {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('listingId', tempListingId)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      if (res.ok) {
        const { url, publicId } = await res.json()
        uploaded.push({ url, publicId })
      } else {
        const { error: err } = await res.json()
        setError(err || 'Yükleme hatası')
      }
    }
    onChange({ photos: [...data.photos, ...uploaded] })
    setUploading(false)
  }

  const handleRemove = (photo: { url: string; publicId: string }) => {
    onChange({ photos: data.photos.filter(p => p.url !== photo.url) })
    const pid = photo.publicId || publicIdFromUrl(photo.url)
    if (pid) {
      fetch('/api/upload', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicId: pid }),
      }).catch(() => {})
    }
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
          {data.photos.map(photo => (
            <div key={photo.url} className={styles.photoItem}>
              <img src={photo.url} alt="" className={styles.photoImg} />
              <button
                className={styles.photoRemove}
                onClick={() => handleRemove(photo)}
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
