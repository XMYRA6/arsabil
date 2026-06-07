export interface WizardFormData {
    city: string
    district: string
    address: string
    title: string
    landSizeSqm: string
    price: string
    zoning: string
    titleDeed: string
    description: string
    phone: string
    photos: string[]
    reportId: string
}

export const emptyFormData: WizardFormData = {
    city: '', district: '', address: '',
    title: '', landSizeSqm: '', price: '',
    zoning: '', titleDeed: '', description: '', phone: '',
    photos: [],
    reportId: '',
}
