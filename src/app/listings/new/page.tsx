'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import styles from './page.module.css'
import { WizardProgress } from '@/components/listing-wizard/WizardProgress'
import { WizardStep1Location } from '@/components/listing-wizard/WizardStep1Location'
import { WizardStep2Detail } from '@/components/listing-wizard/WizardStep2Detail'
import { WizardStep3Photos } from '@/components/listing-wizard/WizardStep3Photos'
import { WizardStep4Feasibility } from '@/components/listing-wizard/WizardStep4Feasibility'
import { WizardStep5Preview } from '@/components/listing-wizard/WizardStep5Preview'
import { WizardFormData, emptyFormData } from '@/components/listing-wizard/types'

const STEP_TITLES = [
  'Konum Bilgisi',
  'Arsa Detayları',
  'Fotoğraflar',
  'Fizibilite Bağla',
  'Önizle & Yayınla',
]

export default function NewListingPage() {
  const { status } = useSession()
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<WizardFormData>(emptyFormData)
  const [publishing, setPublishing] = useState(false)
  const [tempId] = useState(() => `temp-${crypto.randomUUID()}`)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

  const update = (patch: Partial<WizardFormData>) => setForm(prev => ({ ...prev, ...patch }))

  const canGoNext = (): boolean => {
    if (step === 1) return !!form.city
    if (step === 2) return !!form.title && !!form.landSizeSqm
    return true
  }

  const handlePublish = async () => {
    setPublishing(true)
    try {
      const res = await fetch('/api/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city: form.city,
          district: form.district || null,
          address: form.address || null,
          title: form.title,
          landSizeSqm: form.landSizeSqm ? Number(form.landSizeSqm) : null,
          price: form.price ? Number(form.price) : null,
          zoning: form.zoning || null,
          titleDeed: form.titleDeed || null,
          description: form.description || null,
          phone: form.phone || null,
          photos: form.photos.map(p => p.url),
          reportId: form.reportId || null,
        }),
      })
      if (res.ok) {
        const listing = await res.json()
        router.push(`/listing/${listing.id}`)
      } else {
        const err = await res.json()
        alert(err.message || 'İlan yayınlanırken bir hata oluştu.')
        setPublishing(false)
      }
    } catch {
      alert('Bir hata oluştu.')
      setPublishing(false)
    }
  }

  if (status === 'loading') return null

  return (
    <div className={styles.container}>
      <h1 className={styles.pageTitle}>Yeni İlan Oluştur</h1>

      <div className={styles.card}>
        <WizardProgress currentStep={step} />
        <h2 className={styles.stepTitle}>{STEP_TITLES[step - 1]}</h2>

        {step === 1 && <WizardStep1Location data={form} onChange={update} />}
        {step === 2 && <WizardStep2Detail data={form} onChange={update} />}
        {step === 3 && <WizardStep3Photos data={form} onChange={update} tempListingId={tempId} />}
        {step === 4 && <WizardStep4Feasibility data={form} onChange={update} />}
        {step === 5 && <WizardStep5Preview data={form} publishing={publishing} onPublish={handlePublish} />}

        {step < 5 && (
          <div className={styles.nav}>
            {step > 1
              ? <button className={styles.backBtn} onClick={() => setStep(s => s - 1)}>← Geri</button>
              : <div />
            }
            <button className={styles.nextBtn} onClick={() => setStep(s => s + 1)} disabled={!canGoNext()}>
              İleri →
            </button>
          </div>
        )}

        {step === 5 && (
          <div className={styles.nav}>
            <button className={styles.backBtn} onClick={() => setStep(s => s - 1)}>← Geri</button>
            <div />
          </div>
        )}
      </div>
    </div>
  )
}
