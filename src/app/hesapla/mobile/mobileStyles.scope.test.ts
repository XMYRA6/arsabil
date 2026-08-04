import { readFileSync } from 'fs'
import { join } from 'path'

const CSS_YOLU = 'src/app/hesapla/mobile/mobile.module.css'
const css = readFileSync(join(process.cwd(), CSS_YOLU), 'utf8')

/**
 * `@media (max-width: 768px)` blogunun DISINDA kalan metni dondurur.
 *
 * Brace-depth taramasi kullanilir, regex DEGIL: acgozlu bir regex
 * (`[\s\S]*\n\}`) medya sorgusunun disina kacan kurali da yutar ve guard
 * hicbir sey ispat etmeden yesil kalir. Bu tam olarak `MobileScreen`in
 * guard'inda yasandi (A1 oncesi review bulgusu).
 */
export function mediaSorgusuDisi(kaynak: string): string {
    const bas = kaynak.indexOf('@media (max-width: 768px)')
    if (bas === -1) return kaynak
    const ac = kaynak.indexOf('{', bas)
    let derinlik = 0
    let kapanis = -1
    for (let i = ac; i < kaynak.length; i++) {
        if (kaynak[i] === '{') derinlik++
        else if (kaynak[i] === '}') {
            derinlik--
            if (derinlik === 0) { kapanis = i; break }
        }
    }
    if (kapanis === -1) throw new Error('mobil medya sorgusu kapanmamis')
    return (kaynak.slice(0, bas) + kaynak.slice(kapanis + 1))
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .trim()
}

describe('mobile.module.css kapsam guard', () => {
    it('mobil medya sorgusunun DISINDA hicbir kural yok', () => {
        // Bu dosya branch'in en buyuk yeni CSS dosyasi ve masaustune sizmasi
        // en olasi olan yer. Spec 8: yeni cam siniflari guard altinda olmali.
        expect(mediaSorgusuDisi(css)).toBe('')
    })

    it('TUM min-height tanimlari mobil medya sorgusu icinde', () => {
        // Dokunma hedefi min-height'i disari kacarsa masaustu birkac px
        // buyur — bu hata onceki bir fazda UC KEZ yasandi.
        const disi = mediaSorgusuDisi(css)
        expect(disi).not.toMatch(/min-height/)
        expect(css).toMatch(/min-height/) // dosyada gercekten var, test bos gecmiyor
    })

    it('guard sizinti yakalar (kendini dogrulayan test degil)', () => {
        // Medya sorgusunun disina kural eklenmis bir fikstur: kapanis
        // parantezi KENDI SATIRINDA — acgozlu regex'i kandiran sekil.
        const sizintili = `
@media (max-width: 768px) {
    .kural { color: red; }
}
.sizan {
    min-height: 44px;
}
`
        expect(mediaSorgusuDisi(sizintili)).toContain('.sizan')
        expect(mediaSorgusuDisi(sizintili)).toContain('min-height')
    })

    it('temiz fikstur bos doner', () => {
        const temiz = `/* baslik */\n@media (max-width: 768px) {\n    .kural { color: red; }\n}\n`
        expect(mediaSorgusuDisi(temiz)).toBe('')
    })
})

describe('Derin Cam (B) — tokenize edilmemis sapmalar duzeltildi (2026-08-04)', () => {
    it('.stepperAzalt artik var(--m-glass-blur) kullaniyor, ham deger yok', () => {
        expect(css).not.toMatch(/blur\(24px\)\s*saturate\(190%\)/)
    })

    it('.gelismisAyarlarBtn artik var(--m-glass-blur) ve var(--m-r-input) kullaniyor, ham deger yok', () => {
        expect(css).not.toMatch(/blur\(26px\)\s*saturate\(180%\)/)
    })

    it('.metrikKutu / .fisButonu BILEREK degismedi — bunlar --m-grad-accent zemini uzerindeki ayri, hafif cam katmani', () => {
        expect(css).toMatch(/blur\(10px\)/)
    })
})
