'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { WizardShell } from '@/components/listing-wizard/WizardShell'
import { WizardStep1Location } from '@/components/listing-wizard/WizardStep1Location'
import { WizardStep2Detail } from '@/components/listing-wizard/WizardStep2Detail'
import { WizardStep3Photos } from '@/components/listing-wizard/WizardStep3Photos'
import { WizardStep4Feasibility } from '@/components/listing-wizard/WizardStep4Feasibility'
import { WizardStep5Preview } from '@/components/listing-wizard/WizardStep5Preview'
import { WizardFormData, emptyFormData } from '@/components/listing-wizard/types'
import { buildListingPublishBody } from './publishBody'

const STEP_TITLES = [
  'Konum Bilgisi',
  'Arsa Detayları',
  'Fotoğraflar',
  'Fizibilite Bağla',
  'Önizle & Yayınla',
]

// Impeccable critique P1 (2026-09-17): form state yalnızca useState'te
// yaşıyordu — sekme kapanır/yenilenirse TÜM ilerleme (yüklenmiş fotoğraflar
// dahil) sessizce kayboluyordu. sessionStorage'a yazılıp geri okunuyor
// (sekme kapanınca temizlenir — kalıcı localStorage DEĞİL, bilinçli tercih).
const DRAFT_KEY = 'arsabil-listing-wizard-draft'

function readDraft(): { form: WizardFormData; step: number } | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    return {
      form: { ...emptyFormData, ...parsed.form },
      step: typeof parsed.step === 'number' ? parsed.step : 1,
    }
  } catch {
    return null
  }
}

export default function NewListingPage() {
  const { status } = useSession()
  const router = useRouter()
  const [step, setStep] = useState(() => readDraft()?.step ?? 1)
  const [form, setForm] = useState<WizardFormData>(() => readDraft()?.form ?? emptyFormData)
  const [publishing, setPublishing] = useState(false)
  const [tempId] = useState(() => `temp-${crypto.randomUUID()}`)
  const [publishError, setPublishError] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

  useEffect(() => {
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ form, step }))
    } catch {
      // sessionStorage dolu/kapalı olabilir — taslak kalıcılığı best-effort,
      // wizard'ın kendisi bundan bağımsız çalışmaya devam eder.
    }
  }, [form, step])

  const update = (patch: Partial<WizardFormData>) => setForm(prev => ({ ...prev, ...patch }))

  const canGoNext = (): boolean => {
    if (step === 1) return !!form.city && form.lat != null && form.lng != null
    if (step === 2) return !!form.title && !!form.landSizeSqm
    return true
  }

  const handlePublish = async () => {
    setPublishing(true)
    setPublishError('')
    try {
      const res = await fetch('/api/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildListingPublishBody(form)),
      })
      if (res.ok) {
        const listing = await res.json()
        try { sessionStorage.removeItem(DRAFT_KEY) } catch { /* best-effort */ }
        router.push(`/listing/${listing.id}`)
      } else {
        const err = await res.json()
        setPublishError(err.message || 'İlan yayınlanırken bir hata oluştu.')
        setPublishing(false)
      }
    } catch {
      setPublishError('Bir hata oluştu.')
      setPublishing(false)
    }
  }

  if (status === 'loading') return null

  return (
    <>
      {publishError && (
        <div role="alert" style={{ padding: '10px 16px', background: 'rgba(var(--red-rgb),.12)', color: 'var(--red)', fontSize: '.85rem', fontWeight: 600 }}>
          {publishError}
        </div>
      )}
      <WizardShell
        pageTitle="Yeni İlan Oluştur"
        stepTitle={STEP_TITLES[step - 1]}
        step={step}
        onBack={step > 1 ? () => setStep(s => s - 1) : undefined}
        onNext={step < 5 ? () => setStep(s => s + 1) : undefined}
        onStepClick={setStep}
        nextDisabled={!canGoNext()}
      >
        {step === 1 && <WizardStep1Location data={form} onChange={update} />}
        {step === 2 && <WizardStep2Detail data={form} onChange={update} />}
        {step === 3 && <WizardStep3Photos data={form} onChange={update} tempListingId={tempId} />}
        {step === 4 && <WizardStep4Feasibility data={form} onChange={update} />}
        {step === 5 && <WizardStep5Preview data={form} publishing={publishing} onPublish={handlePublish} />}
      </WizardShell>
    </>
  )
}
