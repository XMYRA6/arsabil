import hotspots from './hotspots.json'
import trees from './trees.json'
import surface from './surface.json'

export interface Tree {
  /** taç merkezi (0-1) */ c: [number, number]
  /** taç yarıçapı (0-1) */ r: [number, number]
  /** sallanma pivotu: gövde tabanı (0-1) */ b: [number, number]
  /** genlik çarpanı */ a: number
  /** faz gecikmesi (sn) */ d: number
}
export type Point = [number, number]
/** [x, y, boyut(piksel sayısı)] */
export type Glow = [number, number, number]

export interface SceneFx {
  trees: Tree[]
  water: Point[]
  glow: Glow[]
  surface: Point[]
  weather: { snow: string; wet: string } | null
  crop: string | null
}

const H = hotspots as unknown as Record<string, { water: Point[]; glow: Glow[] }>
const T = trees as unknown as Record<string, Tree[]>
const S = surface as unknown as Record<string, Point[]>

const EMPTY: SceneFx = { trees: [], water: [], glow: [], surface: [], weather: null, crop: null }

/** Sahne id'sine (ör. `villa_modern_duz_gunduz`) göre animasyon verisi. Verisi olmayan sahneler için boş katmanlar. */
export function getFx(sceneId: string): SceneFx {
  if (!(sceneId in H)) return EMPTY
  const hasCrop = /^(tarla_bugday|bag_asma)_duz_/.test(sceneId)
  return {
    trees: T[sceneId] ?? [],
    water: H[sceneId].water,
    glow: H[sceneId].glow,
    surface: S[sceneId] ?? [],
    weather: {
      snow: `/dioramas/weather/${sceneId}-snow.webp`,
      wet: `/dioramas/weather/${sceneId}-wet.webp`,
    },
    crop: hasCrop ? `/dioramas/weather/${sceneId}-crop.webp` : null,
  }
}
