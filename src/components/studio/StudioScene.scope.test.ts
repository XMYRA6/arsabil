import fs from 'fs'
import path from 'path'

const source = fs.readFileSync(path.join(__dirname, 'StudioScene.tsx'), 'utf8')

// Faz 1B Task 2: parsel zemini, onerilen kutle ve kat bantlari icin sabit
// anlamlar STUDIO_SCENE_COLORS'ta tanimlanir; program rengi (Faz 2) gelene
// kadar StudioScene kendi icinde dekoratif hex literal dagitmaz.
const KNOWN_TOKEN_HEX_VALUES = ['#f5f8fc', '#eef4f9', '#b8c7d9', '#dce5ef', '#2b7cff', '#d8e7ff', '#0f2a43', '#f7c948']

describe('StudioScene — gorsel token kaynagi (Faz 1B Task 2)', () => {
  it('studioVisualTokens dan STUDIO_SCENE_COLORS import eder', () => {
    expect(source).toMatch(/import\s*\{[^}]*STUDIO_SCENE_COLORS[^}]*\}\s*from\s*'\.\/studioVisualTokens'/)
  })

  it('token sozlugundeki renkleri artik ham hex literal olarak icermez', () => {
    KNOWN_TOKEN_HEX_VALUES.forEach((hex) => {
      expect(source).not.toContain(`'${hex}'`)
    })
  })
})

// Faz 1B Task 3: prefers-reduced-motion icin kamera/orbit inertia (damping)
// azaltilir. StudioScene bir <Canvas> icerdigi icin jsdom'da render
// edilemez; kaynak metnini denetleyerek dogrulanir (StudioScene.scope.test.ts
// icin zaten kurulu desen).
describe('StudioScene — prefers-reduced-motion (Faz 1B Task 3)', () => {
  it('framer-motion useReducedMotion i kullanir', () => {
    expect(source).toMatch(/import\s*\{[^}]*useReducedMotion[^}]*\}\s*from\s*'framer-motion'/)
  })

  it('OrbitControls in enableDamping degeri reduced-motion sonucuna bagli', () => {
    expect(source).toMatch(/enableDamping=\{!reduceMotion\}/)
  })
})

// Faz 1B Task 4 bullet 1: gerekmedikce kapali render dongusu (frameloop
// "demand") — sahne statik dururken sürekli GPU render tetiklemez, yalnizca
// bir deger degistiginde (orbit, prop) yeniden cizer.
describe('StudioScene — render dongusu (Faz 1B Task 4)', () => {
  it('Canvas frameloop="demand" kullanir', () => {
    expect(source).toMatch(/frameloop=["']demand["']/)
  })
})

// Kok neden (Faz 2A Task 4 sirasinda kordinat matematigi elle turetilirken
// bulundu): `createMassGeometry` merkezlemeden sonra kutle DUNYA Y araligi
// [0, heightM]dir (MassMesh position.y=heightM/2 ile). FloorBands halkalari
// AYNI grubun DOGRUDAN cocugu (ek bir donusum YOK), yani position.y =
// world Y'nin kendisidir. `getFloorBandHeights` zaten yer-goreli (0..heightM)
// degerler dondugu icin halka `height` degerini DOGRUDAN kullanmali —
// `- mass.heightM / 2` cikarma islemi halkalari heightM/2 kadar asagi,
// bazilarini kutlenin ALTINA (negatif Y, zemin altina) kayirıyordu.
describe('StudioScene — kat bandi halka konumu (Faz 2A Task 4 kok neden duzeltmesi)', () => {
  it('halka position.y DOGRUDAN height kullanir, heightM/2 cikarmaz', () => {
    expect(source).toMatch(/position=\{\[0,\s*height,\s*0\]\}/)
    expect(source).not.toMatch(/position=\{\[0,\s*height\s*-\s*mass\.heightM\s*\/\s*2,\s*0\]\}/)
  })
})

// Faz 2A Task 4 bullet 4: "Legend, metin ozeti ve sahne renklerinin ayni
// envanterden geldigini test et" — sahnenin PROGRAM_USE_COLORS'tan ve
// mapProgramBandsToWorldY'den beslendigini, kendi basina renk/pozisyon
// UYDURMADIGINI dogrular.
describe('StudioScene — program bandi renk/konum kaynagi (Faz 2A Task 4)', () => {
  it('PROGRAM_USE_COLORS tablosundan renk okur, kendi renk uretmez', () => {
    expect(source).toMatch(/import\s*\{[^}]*PROGRAM_USE_COLORS[^}]*\}\s*from\s*'\.\/studioVisualTokens'/)
    expect(source).toMatch(/PROGRAM_USE_COLORS\[segment\.band\.use\]/)
  })

  it('mapProgramBandsToWorldY/createProgramBandGeometry den pozisyon/geometri okur', () => {
    expect(source).toMatch(/import\s*\{[^}]*mapProgramBandsToWorldY[^}]*createProgramBandGeometry[^}]*\}\s*from\s*'\.\/programBandGeometry'/)
  })

  it('program verisi yoksa (bos dizi) ekstra dal olmadan zarifce geri doner', () => {
    expect(source).toMatch(/if \(segments\.length === 0\) return null/)
  })
})

// Faz 3A Task 5 bullet 1: 2D yerlesim tahtasinin footprint'i 3D kutleye
// aktarilir. `resolveEffectiveMass` (buildMassGeometry.ts, saf/testable)
// geometri + kamera + kat bantlari + program bandlari icin AYNI kaynaktan
// okunmali — sahnenin kendi icinde ayri bir "override merge" mantigi ICAT
// ETMEDIGINI dogrular.
describe('StudioScene — 2D→3D footprint aktarimi (Faz 3A Task 5)', () => {
  it('resolveEffectiveMass i buildMassGeometry.tsten import eder', () => {
    expect(source).toMatch(/import\s*\{[^}]*resolveEffectiveMass[^}]*\}\s*from\s*'\.\/buildMassGeometry'/)
  })

  it('geometri, kamera, kat bantlari ve program bantlari effectiveMass uzerinden hesaplanir', () => {
    expect(source).toMatch(/createMassGeometry\(effectiveMass\)/)
    expect(source).toMatch(/computeInitialCameraView\(effectiveMass\)/)
    expect(source).toMatch(/<FloorBands mass=\{effectiveMass\}/)
    expect(source).toMatch(/<ProgramBandOverlays mass=\{effectiveMass\}/)
  })
})


