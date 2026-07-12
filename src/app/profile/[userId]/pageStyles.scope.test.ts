import fs from 'fs';
import path from 'path';

const pageCss = fs.readFileSync(path.join(__dirname, 'page.module.css'), 'utf8');
const globalsCss = fs.readFileSync(path.join(__dirname, '../../globals.css'), 'utf8');

describe('profile mobil mühür kimliği token kapsamı', () => {
    it('yeni seal token\'ları globals.css içine hiç sızmamış olmalı', () => {
        expect(globalsCss).not.toMatch(/--seal-(surface|border|recessed)/);
    });

    it('--seal-surface hem dark hem light tema bloğunda tanımlı olmalı', () => {
        expect(pageCss).toMatch(/\[data-theme="dark"\]\s*\.container\s*\{[^}]*--seal-surface:/);
        expect(pageCss).toMatch(/\[data-theme="light"\]\s*\.container\s*\{[^}]*--seal-surface:/);
    });

    it('.section mobilde --seal-surface kullanmalı, masaüstü tanımı hâlâ var(--panel) olmalı', () => {
        const mediaIndex = pageCss.indexOf('@media (max-width: 768px)');
        const desktopSection = pageCss.slice(0, mediaIndex);
        const mobileSection = pageCss.slice(mediaIndex);
        expect(mobileSection).toMatch(/\.section\s*\{[^}]*background:\s*var\(--seal-surface\)/);
        expect(desktopSection).toMatch(/\.section\s*\{[^}]*background:\s*var\(--panel\)/);
    });

    it('.listRow mobilde --seal-recessed ve dokunma hedefi kullanmalı', () => {
        const mediaIndex = pageCss.indexOf('@media (max-width: 768px)');
        const mobileSection = pageCss.slice(mediaIndex);
        expect(mobileSection).toMatch(/\.listRow\s*\{[^}]*background:\s*var\(--seal-recessed\)/);
        expect(mobileSection).toMatch(/\.listRow\s*\{[^}]*min-height:\s*var\(--touch-target\)/);
    });

    it('.listMeta mobilde tabular-nums olmalı', () => {
        const mediaIndex = pageCss.indexOf('@media (max-width: 768px)');
        const mobileSection = pageCss.slice(mediaIndex);
        expect(mobileSection).toMatch(/\.listMeta\s*\{[^}]*font-variant-numeric:\s*tabular-nums/);
    });
});
