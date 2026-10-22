import manifest from './manifest.json'

export type Tur = 'arsa' | 'tarla' | 'villa' | 'ticari' | 'bag' | 'kat'
export type Egim = 'duz' | 'yamac'
export type Zaman = 'gunduz' | 'gece'

export interface SceneValue {
  tur: Tur
  varyant: string
  egim: Egim
  zaman: Zaman
}

export interface SceneResolution {
  id: string
  tur: Tur
  varyant: string
  egim: Egim
  zaman: Zaman
  egimYedek: boolean
  src800: string
  src1600: string
  aspect: number
  etiket: string
}

const TUR_SIRASI: Tur[] = ['arsa', 'tarla', 'villa', 'ticari', 'bag', 'kat']

const TUR_ETIKETLERI: Record<Tur, string> = {
  arsa: 'Arsa',
  tarla: 'Tarla',
  villa: 'Villa',
  ticari: 'Ticari',
  bag: 'Bağ-Bahçe',
  kat: 'Kat karşılığı',
}

const VARYANT_ETIKETLERI: Record<string, string> = {
  agacli: 'Ağaçlı',
  agacsiz: 'Ağaçsız',
  bugday: 'Buğday',
  surulu: 'Sürülü',
  aycicegi: 'Ayçiçeği',
  modern: 'Modern',
  tas1: 'Taş 1',
  tas2: 'Taş 2',
  tas3: 'Taş 3',
  ofis: 'Ofis',
  asma: 'Asma',
  zeytin: 'Zeytin',
  findik: 'Fındık',
  bitmis: 'Bitmiş',
  insaat: 'İnşaat',
}

const VARYANT_SIRALARI: Record<Tur, string[]> = {
  arsa: ['agacli', 'agacsiz'],
  tarla: ['bugday', 'surulu', 'aycicegi'],
  villa: ['modern', 'tas1', 'tas2', 'tas3'],
  ticari: ['ofis'],
  bag: ['asma', 'zeytin', 'findik'],
  kat: ['bitmis', 'insaat'],
}

interface ManifestItem {
  id: string
  varyant: string
  egim: string
  zaman: string
  aspect: number
  files: {
    '800': { file: string; width: number; height: number; bytes: number }
    '1600': { file: string; width: number; height: number; bytes: number }
  }
}

interface ManifestType {
  label: string
  variants: string[]
  items: ManifestItem[]
}

interface Manifest {
  types: Record<Tur, ManifestType>
}

const m = manifest as unknown as Manifest

export function listTurler(): { key: Tur; label: string }[] {
  return TUR_SIRASI.map((key) => ({ key, label: TUR_ETIKETLERI[key] }))
}

export function listVarianlar(tur: Tur): { key: string; label: string }[] {
  const sirali = VARYANT_SIRALARI[tur]
  const manifestVaryants = new Set(m.types[tur]?.variants || [])

  return sirali
    .filter((v) => manifestVaryants.has(v))
    .map((v) => ({ key: v, label: VARYANT_ETIKETLERI[v] }))
}

export function yamacMumkun(tur: Tur, varyant: string): boolean {
  if (tur === 'ticari' || tur === 'kat') return false
  const items = m.types[tur]?.items || []
  return items.some((it) => it.varyant === varyant && (it.egim === 'yamac' || it.egim === 'yamac2'))
}

export function resolveScene(q: { tur: Tur; varyant?: string; egim: Egim; zaman: Zaman }): SceneResolution {
  const { tur, egim, zaman } = q
  let varyant = q.varyant

  if (!varyant || !VARYANT_SIRALARI[tur].includes(varyant)) {
    varyant = VARYANT_SIRALARI[tur][0]
  }

  const items = m.types[tur]?.items || []
  const adaylar = items.filter((it) => it.varyant === varyant && it.zaman === zaman)

  let secilen = adaylar.find((it) => it.egim === egim)

  if (!secilen && egim === 'yamac') {
    secilen = adaylar.find((it) => it.egim === 'yamac2')
  }

  if (!secilen) {
    secilen = adaylar.find((it) => it.egim === 'duz')
  }

  if (!secilen) {
    secilen = adaylar[0]
  }

  if (!secilen) {
    throw new Error(`Sahne bulunamadı: ${tur}/${varyant}/${egim}/${zaman}`)
  }

  const sonucEgim: Egim = secilen.egim === 'duz' ? 'duz' : 'yamac'
  const egimYedek = sonucEgim !== egim

  return {
    id: secilen.id,
    tur,
    varyant,
    egim: sonucEgim,
    zaman,
    egimYedek,
    src800: `/dioramas/${secilen.files['800'].file}`,
    src1600: `/dioramas/${secilen.files['1600'].file}`,
    aspect: secilen.aspect,
    etiket: `${TUR_ETIKETLERI[tur]} · ${VARYANT_ETIKETLERI[varyant]}`,
  }
}
