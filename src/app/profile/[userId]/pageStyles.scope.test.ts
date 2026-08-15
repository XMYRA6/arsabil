import fs from 'fs';
import path from 'path';

const pageCss = fs.readFileSync(path.join(__dirname, 'page.module.css'), 'utf8');
const globalsCss = fs.readFileSync(path.join(__dirname, '../../globals.css'), 'utf8');
const mediaIndex = pageCss.indexOf('@media (max-width: 768px)');
const desktopSection = pageCss.slice(0, mediaIndex);
const mobileSection = pageCss.slice(mediaIndex);

describe('public profile mobile liquid glass scope', () => {
    it('legacy seal tokenlari globals.css ve public profil mobilinde kullanilmamali', () => {
        expect(globalsCss).not.toMatch(/--seal-(surface|border|recessed)/);
        expect(mobileSection).not.toMatch(/--seal-/);
    });

    it('.container mobilde --m-mesh ve --m-bg arka planina gecmeli', () => {
        expect(mobileSection).toMatch(/\.container\s*\{[^}]*background:\s*var\(--m-mesh\),\s*var\(--m-bg\)/);
    });

    it('.header ve .section paylasilan .mStatSurface yuzeyine baglanir (top-level composes), masaustu arka planini @media(min-width:769px) ile korur', () => {
        expect(pageCss).toMatch(/\.header\s*\{[^}]*composes:\s*mStatSurface from global/);
        expect(pageCss).toMatch(/\.section\s*\{[^}]*composes:\s*mStatSurface from global/);
        expect(mobileSection).not.toMatch(/\.header,\s*\.section\s*\{[^}]*background:\s*var\(--m-glass-bg\)/);
        expect(pageCss).toMatch(/@media \(min-width:\s*769px\)\s*\{\s*\.header\s*\{[^}]*background:\s*var\(--bg-body\)/);
        expect(pageCss).toMatch(/@media \(min-width:\s*769px\)\s*\{\s*\.section\s*\{[^}]*background:\s*var\(--panel\)/);
    });

    it('.listRow mobilde paylasilan .mFlatRow (duz, ayracli liste) yuzeyine baglanir — kendi kart kabugunu kaybeder', () => {
        expect(pageCss).toMatch(/\.listRow\s*\{[^}]*composes:\s*mFlatRow from global/);
        expect(mobileSection).not.toMatch(/\.listRow\s*\{[^}]*background:\s*var\(--m-fill\)/);
        expect(mobileSection).toMatch(/\.listRow\s*\{[^}]*min-height:\s*var\(--touch-target\)/);
        expect(pageCss).toMatch(/@media \(min-width:\s*769px\)\s*\{\s*\.listRow\s*\{[^}]*background:\s*var\(--bg\)/);
    });

    it('mobil metinler m-ink/m-body ve metrikler m-mono tabular kullanmali', () => {
        expect(mobileSection).toMatch(/\.name,\s*\.sectionTitle,\s*\.listTitle\s*\{[^}]*color:\s*var\(--m-ink\)/);
        expect(mobileSection).toMatch(/\.bio,\s*\.listMeta\s*\{[^}]*color:\s*var\(--m-body\)/);
        expect(mobileSection).toMatch(/\.listMeta\s*\{[^}]*font-family:\s*var\(--m-mono\)/);
        expect(mobileSection).toMatch(/\.listMeta\s*\{[^}]*font-variant-numeric:\s*tabular-nums/);
    });

    it('mobil avatar/CTA gradient tokenlarini ve verified badge success tokenini kullanmali', () => {
        expect(mobileSection).toMatch(/\.avatarCircle,\s*\.ctaBtn\s*\{[^}]*background:\s*var\(--m-grad-btn\)/);
        expect(mobileSection).toMatch(/\.verifiedBadge\s*\{[^}]*color:\s*var\(--m-success-text\)/);
    });
});