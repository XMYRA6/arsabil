import fs from 'fs'
import path from 'path'

const css = fs.readFileSync(path.join(__dirname, 'ParcelVerificationSheet.module.css'), 'utf8')
const globalsCss = fs.readFileSync(path.join(__dirname, '../../app/globals.css'), 'utf8')
const mobile = () => css.slice(css.indexOf('@media (max-width: 768px)'))

describe('ParcelVerificationSheet mobil mühür kimliği', () => {
    it('seal tokenlari globals.css icine sizmamis olmali', () => {
        expect(globalsCss).not.toMatch(/--seal-(accent|surface|border|text|recessed)/)
    })

    it('--seal-accent kanonik Aurora cyan olmali', () => {
        expect(css).toMatch(/--seal-accent:\s*var\(--aurora-cyan\)/)
        expect(css).not.toMatch(/#4C8DFF/i)
    })

    it('token tanimlari mobil media query icinde olmali', () => {
        const mediaIndex = css.indexOf('@media (max-width: 768px)')
        expect(mediaIndex).toBeGreaterThan(-1)
        expect(css.indexOf('--seal-surface:')).toBeGreaterThan(mediaIndex)
    })

    it('.sheet arkaplani !important tasimali — BottomSheet.module.css ayri dosya, kaynak sirasina guvenilmez', () => {
        expect(mobile()).toMatch(/\.sheet\s*\{[^}]*background:\s*var\(--seal-surface\)\s*!important/)
    })

    it('aktif toggle segmenti koyultulmus ton tasimali (beyaz metin kontrasti icin)', () => {
        expect(mobile()).toMatch(/\.modeBtnOn\s*\{[^}]*background:\s*color-mix\(in srgb,\s*var\(--seal-accent\)\s*82%,\s*#0F2A43\)/)
    })

    it('mobil Aktar butonu koyultulmus ton tasimali', () => {
        expect(mobile()).toMatch(/\.mobileFooter \.applyBtn\s*\{[^}]*background:\s*color-mix\(in srgb,\s*var\(--seal-accent\)\s*82%,\s*#0F2A43\)/)
    })

    it('masaustu (media query disi) .modal/.overlay/.applyBtn hicbir seal token tuketmemeli', () => {
        const desktop = css.slice(0, css.indexOf('@media (max-width: 768px)'))
        expect(desktop).not.toMatch(/--seal-/)
    })
})
