import fs from 'fs'
import path from 'path'

const css = fs.readFileSync(path.join(__dirname, 'ParcelVerificationSheet.module.css'), 'utf8')
const pickerCss = fs.readFileSync(path.join(__dirname, 'ParcelPicker.module.css'), 'utf8')
const globalsCss = fs.readFileSync(path.join(__dirname, '../../app/globals.css'), 'utf8')
const mobile = () => css.slice(css.indexOf('@media (max-width: 768px)'))

describe('ParcelVerificationSheet Arazi dili', () => {
    it('eski mühür (--seal-*) ve cam tokenlari kalmamis olmali', () => {
        expect(globalsCss).not.toMatch(/--seal-(accent|surface|border|text|recessed)/)
        for (const dosya of [css, pickerCss]) {
            expect(dosya).not.toMatch(/--seal-|--brand-gradient|--shell-bg|--aurora-/)
            expect(dosya).not.toMatch(/var\(--(panel|border|label-color|card-title|input-bg|green-rgb|orange-rgb)\)/)
        }
    })

    it('mod seçici diğer ekranlarla aynı segment dili: aktif segment amber', () => {
        expect(css).toMatch(/\.modeBtnOn\s*\{[^}]*background:\s*var\(--amber\)/)
        expect(css).toMatch(/\.toggleRow\s*\{[^}]*border-radius:\s*999px/)
    })

    it('birincil eylem mavi hap, devre dışıyken yumuşak yüzey', () => {
        expect(css).toMatch(/\.applyBtn\s*\{[^}]*background:\s*var\(--blue\)/)
        expect(css).toMatch(/\.applyBtn:disabled\s*\{[^}]*background:\s*var\(--surface-2\)/)
    })

    it('.sheet opak yüzeye bağlı (!important — BottomSheet.module.css ayrı dosya, kaynak sırasına güvenilmez)', () => {
        expect(mobile()).toMatch(/\.sheet\s*\{[^}]*background:\s*var\(--surface\)\s*!important/)
    })

    it('.sheet mobilde tam ekran yüksekliğine çıkar; --keyboard-inset düşülür (klavye açılınca içerik klavyenin üstünde kalır)', () => {
        expect(mobile()).toMatch(/\.sheet\s*\{[^}]*max-height:\s*calc\(100dvh\s*-\s*var\(--safe-top,\s*0px\)\s*-\s*var\(--keyboard-inset,\s*0px\)\)\s*!important/)
    })

    it('.sheetPicking sabit yüksekliği de --keyboard-inset düşer (height gerçek zorlayıcı değerdir)', () => {
        expect(mobile()).toMatch(/\.sheetPicking\s*\{[^}]*height:\s*calc\(100dvh\s*-\s*var\(--safe-top,\s*0px\)\s*-\s*var\(--keyboard-inset,\s*0px\)\)\s*!important/)
    })

    it('mobilde uzun açıklama gizli (tek ipucu haritanın altında), Aktar düğmesi altta yapışkan', () => {
        expect(mobile()).toMatch(/\.instructions\s*\{[^}]*display:\s*none/)
        expect(css).toMatch(/\.mobileFooter\s*\{[^}]*position:\s*sticky/)
    })
})
