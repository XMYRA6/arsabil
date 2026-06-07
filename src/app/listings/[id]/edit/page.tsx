'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useParams, useRouter } from 'next/navigation'
import styles from '../../new/page.module.css'
import { WizardProgress } from '@/components/listing-wizard/WizardProgress'
import { WizardStep1Location } from '@/components/listing-wizard/WizardStep1Location'
import { WizardStep2Detail } from '@/components/listing-wizard/WizardStep2Detail'
import { WizardStep3Photos } from '@/components/listing-wizard/WizardStep3Photos'
import { WizardStep4Feasibility } from '@/components/listing-wizard/WizardStep4Feasibility'
import { WizardFormData, emptyFormData } from '@/components/listing-wizard/types'

const STEP_TITLES = [
    'Konum Bilgisi',
    'Arsa Detayları',
    'Fotoğraflar',
    'Fizibilite Bağla',
    'Önizle & Kaydet',
]

export default function EditListingPage() {
    const { status } = useSession()
    const router = useRouter()
    const params = useParams()
    const id = params?.id as string
    const [step, setStep] = useState(1)
    const [form, setForm] = useState<WizardFormData>(emptyFormData)
    const [loadingData, setLoadingData] = useState(true)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (status === 'unauthenticated') router.push('/login')
    }, [status, router])

    useEffect(() => {
        if (status !== 'authenticated' || !id) return
        fetch(`/api/listings/${id}`)
            .then(r => r.json())
            .then(listing => {
                if (!listing?.id) { router.push('/marketplace'); return }
                setForm({
                    city: listing.city ?? '',
                    district: listing.district ?? '',
                    address: listing.address ?? '',
                    title: listing.title ?? '',
                    landSizeSqm: listing.landSizeSqm ? String(listing.landSizeSqm) : '',
                    price: listing.price ? String(listing.price) : '',
                    zoning: listing.zoning ?? '',
                    titleDeed: listing.titleDeed ?? '',
                    description: listing.description ?? '',
                    phone: listing.phone ?? '',
                    photos: (listing.photos ?? []).map((url: string) => ({ url, publicId: '' })),
                    reportId: listing.reportId ?? '',
                })
            })
            .catch(() => router.push('/marketplace'))
            .finally(() => setLoadingData(false))
    }, [status, id, router])

    const update = (patch: Partial<WizardFormData>) => setForm(prev => ({ ...prev, ...patch }))

    const canGoNext = (): boolean => {
        if (step === 1) return !!form.city
        if (step === 2) return !!form.title && !!form.landSizeSqm
        return true
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            const res = await fetch(`/api/listings/${id}`, {
                method: 'PATCH',
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
                router.push(`/listing/${id}`)
            } else {
                const err = await res.json()
                alert(err.message || err.error || 'İlan güncellenirken bir hata oluştu.')
                setSaving(false)
            }
        } catch {
            alert('Bir hata oluştu.')
            setSaving(false)
        }
    }

    if (status === 'loading' || loadingData) return null

    return (
        <div className={styles.container}>
            <h1 className={styles.pageTitle}>İlanı Düzenle</h1>

            <div className={styles.card}>
                <WizardProgress currentStep={step} />
                <h2 className={styles.stepTitle}>{STEP_TITLES[step - 1]}</h2>

                {step === 1 && <WizardStep1Location data={form} onChange={update} />}
                {step === 2 && <WizardStep2Detail data={form} onChange={update} />}
                {step === 3 && <WizardStep3Photos data={form} onChange={update} tempListingId={id} />}
                {step === 4 && <WizardStep4Feasibility data={form} onChange={update} />}
                {step === 5 && (
                    <div style={{ padding: '1rem 0' }}>
                        <p style={{ color: 'var(--muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                            İlanı kaydetmek, tekrar admin onayına gönderecek. Onay sonrası marketplace&apos;te görünür.
                        </p>
                        <button
                            onClick={handleSave}
                            disabled={saving || !form.title || !form.city}
                            style={{
                                padding: '0.75rem 2rem', background: 'var(--primary)', color: 'white',
                                border: 'none', borderRadius: '8px', fontWeight: 700,
                                cursor: saving ? 'not-allowed' : 'pointer', fontSize: '1rem',
                                opacity: (saving || !form.title || !form.city) ? 0.6 : 1,
                            }}
                        >
                            {saving ? 'Kaydediliyor...' : '💾 İlanı Kaydet'}
                        </button>
                    </div>
                )}

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
