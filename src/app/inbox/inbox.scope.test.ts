import fs from 'fs';
import path from 'path';

const css = fs.readFileSync(path.join(__dirname, 'inbox.module.css'), 'utf8');
const globalsCss = fs.readFileSync(path.join(__dirname, '../globals.css'), 'utf8');
const mobile = () => css.slice(css.indexOf('@media (max-width: 768px)'));

describe('inbox mobil mühür kimliği (Faz 2.5) — kabuk', () => {
  it('seal token\'ları globals.css içine sızmamış olmalı', () => {
    expect(globalsCss).not.toMatch(/--seal-(accent|surface|border|text|recessed)/);
  });

  it('--seal-accent kanonik Aurora cyan olmalı', () => {
    expect(css).toMatch(/--seal-accent:\s*var\(--aurora-cyan\)/);
    expect(css).not.toMatch(/#4C8DFF/i);
  });

  it('token tanımları mobil media query İÇİNDE olmalı', () => {
    const mediaIndex = css.indexOf('@media (max-width: 768px)');
    expect(mediaIndex).toBeGreaterThan(-1);
    expect(css.indexOf('--seal-surface:')).toBeGreaterThan(mediaIndex);
  });

  it('kabuk yüzeyleri seal-surface tüketmeli', () => {
    expect(mobile()).toMatch(/\[data-theme="dark"\]\s*\.sidebar,\s*\[data-theme="light"\]\s*\.sidebar\s*\{[^}]*background:\s*var\(--seal-surface\)/);
    expect(mobile()).toMatch(/\.chatHeader\s*\{[^}]*background:\s*var\(--seal-surface\)/);
    expect(mobile()).toMatch(/\.inputArea\s*\{[^}]*background:\s*var\(--seal-surface\)/);
  });

  it('.inputWrapper bir kademe geri (recessed) tonda olmalı — panelle aynı camda kaybolmasın', () => {
    expect(mobile()).toMatch(/\.inputWrapper\s*\{[^}]*background:\s*var\(--seal-recessed\)/);
  });

  it('.convItemActive bileşik seçici kullanmalı (tema override\'ına karşı specificity)', () => {
    expect(mobile()).toMatch(/\.convItem\.convItemActive\s*\{/);
  });

  it('.convItemActive arkaplanı !important taşımalı — canlı doğrulama, masaüstü .convItemActive kuralının (satır ~120) !important background\'ının aksi halde kazandığını kanıtladı; border-color\'da böyle bir çakışma yok, o yüzden !important taşımamalı', () => {
    const newRules = mobile().match(/\.convItem\.convItemActive\s*\{([^}]*)\}/);
    expect(newRules).not.toBeNull();
    expect(newRules![1]).toMatch(/background:\s*rgba\(var\(--seal-accent-rgb\),\s*0\.12\)\s*!important/);
    expect(newRules![1]).not.toMatch(/border-color:[^;]*!important/);
  });

  it('.sidebar arkaplanı tema-scoped seçici + !important taşımalı — düz `.sidebar` + !important, mevcut mobil .sidebar !important kuralıyla (satır ~506) aynı specificity\'de kalıp yalnızca kaynak sırasına güvenirdi (plan kısıtı: "kuralı sona koymaya güvenme"); tema-scoped seçici (0,2,0) sıralamadan bağımsız kazanır', () => {
    const sealSidebarRule = mobile().match(/\[data-theme="dark"\]\s*\.sidebar,\s*\[data-theme="light"\]\s*\.sidebar\s*\{([^}]*)\}/);
    expect(sealSidebarRule).not.toBeNull();
    expect(sealSidebarRule![1]).toMatch(/background:\s*var\(--seal-surface\)\s*!important/);
    expect(mobile()).not.toMatch(/\n\s*\.sidebar\s*\{\s*background:\s*var\(--seal-surface\)/);
  });

  it('.unreadBadge semantik rengi kimliğe alınmamalı', () => {
    expect(mobile()).not.toMatch(/\.unreadBadge\s*\{[^}]*--seal-accent/);
  });

  it('--seal-text tanımlanmamalı (tüketicisi yok — plan kısıtı: yalnızca tüketilen token tanımlanır)', () => {
    expect(mobile()).not.toMatch(/--seal-text:/);
  });

  it('.bubbleTheirs ve .messagesArea kimliğe alınmamış olmalı (Task 5 sonrası da geçerli: bubbleTheirs okunabilirlik kararıyla, messagesArea hiç dahil değil)', () => {
    expect(mobile()).not.toMatch(/\.bubbleTheirs\s*\{[^}]*--seal/);
    expect(mobile()).not.toMatch(/\.messagesArea\s*\{[^}]*--seal/);
  });
});

describe('inbox mobil mühür kimliği (Faz 2.5) — sohbet balonları', () => {
  it('.bubbleMine mobilde seal aksanına geçmeli — koyultulmuş ton (kontrast ölçümü: düz --seal-accent üzerinde beyaz metin 3.868:1, WCAG AA 4.5:1 eşiğinin altında; color-mix ile #0F2A43\'e 18% karıştırılmış hal canlı ölçümde 4.87:1 veriyor)', () => {
    expect(mobile()).toMatch(/\.bubbleMine\s*\{[^}]*background:\s*color-mix\(in srgb,\s*var\(--seal-accent\)\s*82%,\s*#0F2A43\)/);
  });

  it('.bubbleMine masaüstünde brand-gradient olarak KALMALI', () => {
    const desktop = css.slice(0, css.indexOf('@media (max-width: 768px)'));
    expect(desktop).toMatch(/\.bubbleMine\s*\{[^}]*background:\s*var\(--brand-gradient\)/);
  });

  it('.bubbleTheirs kimliğe alınmamalı (okunabilirlik kararı)', () => {
    expect(mobile()).not.toMatch(/\.bubbleTheirs\s*\{[^}]*--seal|\.bubbleTheirs\s*\{[^}]*seal-accent/);
  });

  it('kaydırılan mesaj listesine backdrop-filter eklenmemeli (performans kararı)', () => {
    expect(mobile()).not.toMatch(/\.messagesArea\s*\{[^}]*backdrop-filter/);
    expect(mobile()).not.toMatch(/\.bubble\s*\{[^}]*backdrop-filter/);
    expect(mobile()).not.toMatch(/\.bubbleMine\s*\{[^}]*backdrop-filter/);
  });

  it('.bubbleMine köşe yarıçapı korunmalı (kuyruk yönü değişmesin)', () => {
    const desktop = css.slice(0, css.indexOf('@media (max-width: 768px)'));
    expect(desktop).toMatch(/\.bubbleMine\s*\{[^}]*border-radius:\s*22px 22px 4px 22px/);
  });
});
