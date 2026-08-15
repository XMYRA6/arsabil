import fs from 'fs';
import path from 'path';

const css = fs.readFileSync(path.join(__dirname, 'inbox.module.css'), 'utf8');
const globalsCss = fs.readFileSync(path.join(__dirname, '../globals.css'), 'utf8');
const mobile = () => css.slice(css.indexOf('@media (max-width: 768px)'));

describe('inbox mobil Liquid Glass kimligi (Faz 4) — kabuk ve liste', () => {
  it('mobil Liquid Glass tokenlari globals.css icinde tanimli olmali', () => {
    expect(globalsCss).toMatch(/--m-glass-bg:/);
    expect(globalsCss).toMatch(/--m-mesh:/);
    expect(globalsCss).toMatch(/--m-grad-btn:/);
  });

  it('mobil CSS artik --seal-* token sozlesmesine bagli degil', () => {
    expect(mobile()).not.toMatch(/--seal-/);
  });

  it('kabuk yuzeyleri --m-* cam tokenlarini kullanmali', () => {
    expect(mobile()).toMatch(/\.inboxContainer\s*\{[^}]*background:\s*var\(--m-mesh\)/);
    expect(mobile()).toMatch(/\.sidebar\s*\{[^}]*background:\s*var\(--m-glass-bg\)\s*!important/);
    expect(mobile()).toMatch(/\.chatHeader\s*\{[^}]*background:\s*var\(--m-glass-bg\)/);
    expect(mobile()).toMatch(/\.inputArea\s*\{[^}]*background:\s*var\(--m-glass-bg\)/);
  });

  it('.inputWrapper bir kademe geri fill tonda olmali', () => {
    expect(mobile()).toMatch(/\.inputWrapper\s*\{[^}]*background:\s*var\(--m-fill\)/);
  });

  it('.convItemActive bilesik secici kullanmali ve masaustu important kuralina karsi background important tasimali', () => {
    const activeRule = mobile().match(/\.convItem\.convItemActive\s*\{([^}]*)\}/);
    expect(activeRule).not.toBeNull();
    expect(activeRule![1]).toMatch(/background:\s*var\(--m-fill\)\s*!important/);
    expect(activeRule![1]).not.toMatch(/border-color:[^;]*!important/);
  });

  it('.unreadBadge semantik rengi kimlige alinmamali', () => {
    expect(mobile()).not.toMatch(/\.unreadBadge\s*\{[^}]*--m-/);
  });

  it('.convItem paylasilan .mRowList yuzeyine baglanir, .convTime mono zaman etiketi olmali', () => {
    expect(mobile()).toMatch(/\.convItem\s*\{[^}]*composes:\s*mRowList from global/);
    expect(mobile()).not.toMatch(/\.convItem\s*\{[^}]*background:\s*var\(--m-glass-bg\)/);
    expect(mobile()).toMatch(/\.convTime\s*\{[^}]*font-family:\s*var\(--m-mono\)/);
  });
});

describe('inbox mobil Liquid Glass kimligi (Faz 4) — sohbet balonlari', () => {
  it('.bubbleMine mobilde m gradient buton zeminine gecmeli', () => {
    expect(mobile()).toMatch(/\.bubbleMine\s*\{[^}]*background:\s*var\(--m-grad-btn\)/);
  });

  it('.bubbleMine masaustunde brand-gradient olarak KALMALI', () => {
    const desktop = css.slice(0, css.indexOf('@media (max-width: 768px)'));
    expect(desktop).toMatch(/\.bubbleMine\s*\{[^}]*background:\s*var\(--brand-gradient\)/);
  });

  it('.bubbleTheirs kimlige alinmamali (okunabilirlik karari)', () => {
    expect(mobile()).not.toMatch(/\.bubbleTheirs\s*\{[^}]*--m-|\.bubbleTheirs\s*\{[^}]*m-grad/);
  });

  it('kaydirilan mesaj listesine backdrop-filter eklenmemeli (performans karari)', () => {
    expect(mobile()).not.toMatch(/\.messagesArea\s*\{[^}]*backdrop-filter/);
    expect(mobile()).not.toMatch(/\.bubble\s*\{[^}]*backdrop-filter/);
    expect(mobile()).not.toMatch(/\.bubbleMine\s*\{[^}]*backdrop-filter/);
  });

  it('.bubbleMine kose yaricapi korunmali (kuyruk yonu degismesin)', () => {
    const desktop = css.slice(0, css.indexOf('@media (max-width: 768px)'));
    expect(desktop).toMatch(/\.bubbleMine\s*\{[^}]*border-radius:\s*22px 22px 4px 22px/);
  });
});
