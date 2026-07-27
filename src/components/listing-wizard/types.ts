import type { ParcelInfo } from '@/lib/tkgm/parcel'
import type { ParcelPickerStatus } from './ParcelPicker'

export interface WizardFormData {
    city: string
    district: string
    address: string
    lat: number | null
    lng: number | null
    parcel: ParcelInfo | null
    parcelStatus: ParcelPickerStatus
    title: string
    landSizeSqm: string
    price: string
    zoning: string
    titleDeed: string
    description: string
    phone: string
    photos: { url: string; publicId: string }[]
    reportId: string
}

export const emptyFormData: WizardFormData = {
    city: '', district: '', address: '',
    lat: null, lng: null, parcel: null, parcelStatus: 'idle',
    title: '', landSizeSqm: '', price: '',
    zoning: '', titleDeed: '', description: '', phone: '',
    photos: [],
    reportId: '',
}
