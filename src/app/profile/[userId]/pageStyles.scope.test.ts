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

    it('.header ve .section mobilde m-glass yuzey kullanmali, masaustu .section var(--panel) kalmali', () => {
        expect(mobileSection).toMatch(/\.header,\s*\.section\s*\{[^}]*background:\s*var\(--m-glass-bg\)/);
        expect(mobileSection).toMatch(/backdrop-filter:\s*var\(--m-glass-blur\)/);
        expect(desktopSection).toMatch(/\.section\s*\{[^}]*background:\s*var\(--panel\)/);
    });

    it('.listRow mobilde m-fill, m-glass-border ve dokunma hedefi kullanmali', () => {
        expect(mobileSection).toMatch(/\.listRow\s*\{[^}]*background:\s*var\(--m-fill\)/);
        expect(mobileSection).toMatch(/\.listRow\s*\{[^}]*border:\s*1px solid var\(--m-glass-border\)/);
        expect(mobileSection).toMatch(/\.listRow\s*\{[^}]*min-height:\s*var\(--touch-target\)/);
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