import fs from 'fs';
import path from 'path';

const css = fs.readFileSync(path.join(__dirname, 'ScenarioCompare.module.css'), 'utf8');
const globalsCss = fs.readFileSync(path.join(__dirname, '../app/globals.css'), 'utf8');

describe('ScenarioCompare mobil kart karşılaştırma token kapsamı', () => {
    it('yeni seal token\'ları globals.css içine hiç sızmamış olmalı', () => {
        expect(globalsCss).not.toMatch(/--seal-(surface|border|text|accent)/);
    });

    it('--seal-accent, diğer sayfalarla aynı Aurora cyan\'ı kullanmalı', () => {
        expect(css).toMatch(/--seal-accent:\s*var\(--aurora-cyan\)/);
    });

    it('--seal-surface hem dark hem light tema bloğunda tanımlı olmalı', () => {
        expect(css).toMatch(/\[data-theme="dark"\]\s*\.root\s*\{[^}]*--seal-surface:/);
        expect(css).toMatch(/\[data-theme="light"\]\s*\.root\s*\{[^}]*--seal-surface:/);
    });

    it('.tableWrap masaüstünde görünür/mobilde gizli, .mobileCards tam tersi olmalı', () => {
        const mediaIndex = css.indexOf('@media (max-width: 768px)');
        const desktopSection = css.slice(0, mediaIndex);
        const mobileSection = css.slice(mediaIndex);
        expect(desktopSection).toMatch(/\.mobileCards\s*\{[^}]*display:\s*none/);
        expect(mobileSection).toMatch(/\.tableWrap\s*\{[^}]*display:\s*none/);
        expect(mobileSection).toMatch(/\.mobileCards\s*\{[^}]*display:\s*block/);
    });

    it('.cardValue tabular-nums ve mono font kullanmalı', () => {
        expect(css).toMatch(/\.cardValue\s*\{[^}]*font-variant-numeric:\s*tabular-nums/);
        expect(css).toMatch(/\.cardValue\s*\{[^}]*JetBrains Mono/);
    });
});
