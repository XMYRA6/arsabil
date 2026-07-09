'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useParams, useRouter } from 'next/navigation'
import { WizardShell } from '@/components/listing-wizard/WizardShell'
import { WizardStep1Location } from '@/components/listing-wizard/WizardStep1Location'
import { WizardStep2Detail } from '@/components/listing-wizard/WizardStep2Detail'
import { WizardStep3Photos } from '@/components/listing-wizard/WizardStep3Photos'
import { WizardStep4Feasibility } from '@/components/listing-wizard/WizardStep4Feasibility'
import { WizardFormData, emptyFormData } from '@/components/listing-wizard/types'
import wizardStyles from '@/components/listing-wizard/wizard.module.css'

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
        <WizardShell
            pageTitle="İlanı Düzenle"
            stepTitle={STEP_TITLES[step - 1]}
            step={step}
            onBack={step > 1 ? () => setStep(s => s - 1) : undefined}
            onNext={step < 5 ? () => setStep(s => s + 1) : undefined}
            nextDisabled={!canGoNext()}
        >
            {step === 1 && <WizardStep1Location data={form} onChange={update} />}
            {step === 2 && <WizardStep2Detail data={form} onChange={update} />}
            {step === 3 && <WizardStep3Photos data={form} onChange={update} tempListingId={id} />}
            {step === 4 && <WizardStep4Feasibility data={form} onChange={update} />}
            {step === 5 && (
                <div className={wizardStyles.stepContainer}>
                    <p className={wizardStyles.dropZoneText}>
                        İlanı kaydetmek, tekrar admin onayına gönderecek. Onay sonrası marketplace&apos;te görünür.
                    </p>
                    <button
                        onClick={handleSave}
                        disabled={saving || !form.title || !form.city}
                        className={wizardStyles.editSaveBtn}
                    >
                        {saving ? 'Kaydediliyor...' : '💾 İlanı Kaydet'}
                    </button>
                </div>
            )}
        </WizardShell>
    )
}
