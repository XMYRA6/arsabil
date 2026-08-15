import fs from 'fs';
import path from 'path';

const css = fs.readFileSync(path.join(__dirname, 'ScenarioCompare.module.css'), 'utf8');
const globalsCss = fs.readFileSync(path.join(__dirname, '../app/globals.css'), 'utf8');
const mobileSection = css.slice(css.indexOf('@media (max-width: 768px)'));

describe('ScenarioCompare mobil kart karşılaştırma token kapsamı', () => {
    it('yeni seal tokenları globals.css içine hiç sızmamış olmalı', () => {
        expect(globalsCss).not.toMatch(/--seal-(surface|border|text|accent)/);
    });

    it('mobil görünüm artık --m-* Liquid Glass tokenlarını kullanmalı, --seal-* değil', () => {
        expect(mobileSection).toMatch(/\.scenarioCard\s*\{[^}]*background:\s*var\(--m-glass-bg\)/);
        expect(mobileSection).toMatch(/\.scenarioCard\s*\{[^}]*border:\s*1px solid var\(--m-glass-border\)/);
        expect(mobileSection).toMatch(/backdrop-filter:\s*var\(--m-glass-blur\)/);
        expect(mobileSection).not.toMatch(/--seal-/);
    });

    it('.tableWrap masaüstünde görünür/mobilde gizli, .mobileCards tam tersi olmalı', () => {
        const mediaIndex = css.indexOf('@media (max-width: 768px)');
        const desktopSection = css.slice(0, mediaIndex);
        expect(desktopSection).toMatch(/\.mobileCards\s*\{[^}]*display:\s*none/);
        expect(mobileSection).toMatch(/\.tableWrap\s*\{[^}]*display:\s*none/);
        expect(mobileSection).toMatch(/\.mobileCards\s*\{[^}]*display:\s*block/);
    });

    it('.scenarioTabs mobilde segment kontrolü olarak --m-fill ve --m-grad-btn kullanmalı', () => {
        expect(mobileSection).toMatch(/\.scenarioTabs\s*\{[^}]*background:\s*var\(--m-fill\)/);
        expect(mobileSection).toMatch(/\.scenarioTab,\s*\.scenarioTabActive\s*\{[^}]*min-height:\s*var\(--touch-target\)/);
        expect(mobileSection).toMatch(/\.scenarioTabActive\s*\{[^}]*background:\s*var\(--m-grad-btn\)/);
    });

    it('.cardValue tabular-nums ve --m-mono kullanmalı', () => {
        expect(mobileSection).toMatch(/\.cardValue\s*\{[^}]*font-variant-numeric:\s*tabular-nums/);
        expect(mobileSection).toMatch(/\.cardValue\s*\{[^}]*font-family:\s*var\(--m-mono\)/);
    });
});