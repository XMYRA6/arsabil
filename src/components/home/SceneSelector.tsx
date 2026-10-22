'use client'

import { Chip } from '@/components/ui/Chip'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Badge } from '@/components/ui/Badge'
import {
  SceneValue,
  listTurler,
  listVarianlar,
  yamacMumkun,
  resolveScene,
  Tur,
} from '@/lib/dioramas/scene'
import styles from './SceneSelector.module.css'

interface SceneSelectorProps {
  value: SceneValue
  onChange: (v: SceneValue) => void
  auto?: boolean
}

export function SceneSelector({ value, onChange, auto }: SceneSelectorProps) {
  const turler = listTurler()
  const varyantlar = listVarianlar(value.tur)
  const yamacVar = yamacMumkun(value.tur, value.varyant)

  const handleTurChange = (tur: Tur) => {
    const ilkVaryant = listVarianlar(tur)[0]?.key || ''
    const newYamacVar = yamacMumkun(tur, ilkVaryant)
    onChange({
      tur,
      varyant: ilkVaryant,
      egim: newYamacVar ? value.egim : 'duz',
      zaman: value.zaman,
    })
  }

  const handleVaryantChange = (varyant: string) => {
    const newYamacVar = yamacMumkun(value.tur, varyant)
    onChange({
      tur: value.tur,
      varyant,
      egim: newYamacVar ? value.egim : 'duz',
      zaman: value.zaman,
    })
  }

  const egimItems = [
    { value: 'duz', label: 'Düz' },
    { value: 'yamac', label: 'Yamaç' },
  ]

  const zamanItems = [
    { value: 'gunduz', label: 'Gündüz' },
    { value: 'gece', label: 'Gece' },
  ]

  const resolved = resolveScene(value)
  const imgWidth = 1600
  const imgHeight = Math.round(imgWidth / resolved.aspect)

  return (
    <div className={styles.container}>
      <div role="group" aria-label="Arazi türü" className={styles.turler}>
        {turler.map((t) => (
          <Chip
            key={t.key}
            selected={value.tur === t.key}
            onClick={() => handleTurChange(t.key)}
          >
            {t.label}
          </Chip>
        ))}
      </div>

      {varyantlar.length > 1 && (
        <div role="group" aria-label="Varyant" className={styles.varyantlar}>
          {varyantlar.map((v) => (
            <Chip
              key={v.key}
              selected={value.varyant === v.key}
              onClick={() => handleVaryantChange(v.key)}
            >
              {v.label}
            </Chip>
          ))}
        </div>
      )}

      <div className={styles.controls}>
        {yamacVar ? (
          <SegmentedControl
            ariaLabel="Eğim"
            items={egimItems}
            value={value.egim}
            onChange={(egim) => onChange({ ...value, egim: egim as 'duz' | 'yamac' })}
          />
        ) : (
          <p className={styles.note}>Şehir içi: düz kullanılır</p>
        )}

        <SegmentedControl
          ariaLabel="Zaman"
          items={zamanItems}
          value={value.zaman}
          onChange={(zaman) => onChange({ ...value, zaman: zaman as 'gunduz' | 'gece' })}
        />
      </div>

      <figure className={styles.figure}>
        {auto && (
          <div className={styles.badgeContainer}>
            <Badge tone="amber">Otomatik</Badge>
          </div>
        )}
        <div className={styles.preview}>
          <img
            src={resolved.src1600}
            srcSet={`${resolved.src800} 800w, ${resolved.src1600} 1600w`}
            sizes="(max-width: 768px) 92vw, 640px"
            alt={`${resolved.etiket} · ${value.egim === 'yamac' ? 'yamaç' : 'düz'} · ${value.zaman === 'gece' ? 'gece' : 'gündüz'}`}
            width={imgWidth}
            height={imgHeight}
            loading="eager"
          />
        </div>
        <figcaption className={styles.caption}>{resolved.id}</figcaption>
      </figure>
    </div>
  )
}
