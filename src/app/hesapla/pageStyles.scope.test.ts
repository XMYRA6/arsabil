import fs from 'fs';
import path from 'path';

const pageCss = fs.readFileSync(path.join(__dirname, 'page.module.css'), 'utf8');
const globalsCss = fs.readFileSync(
  path.join(__dirname, '../globals.css'),
  'utf8'
);

describe('hesapla mobil Mühür Lacivert token kapsamı', () => {
  it('yeni seal token\'ları globals.css içine hiç sızmamış olmalı', () => {
    expect(globalsCss).not.toMatch(/--seal-(ink|accent|paper)/);
  });

  it('--seal-accent token\'ı page.module.css içinde tanımlı olmalı', () => {
    expect(pageCss).toMatch(/--seal-accent:\s*#C9A15A/);
  });

  it('--seal-accent tanımı, mobil @media (max-width: 768px) bloğunun içinde olmalı', () => {
    const lastMobileMediaIndex = pageCss.lastIndexOf('@media (max-width: 768px)');
    const sealAccentIndex = pageCss.indexOf('--seal-accent:');
    expect(lastMobileMediaIndex).toBeGreaterThan(-1);
    expect(sealAccentIndex).toBeGreaterThan(lastMobileMediaIndex);
  });

  it('--seal-paper-rgb token\'ı page.module.css içinde tanımlı olmalı', () => {
    expect(pageCss).toMatch(/--seal-paper-rgb:\s*244,\s*240,\s*230/);
  });

  it('--seal-paper-rgb tanımı, mobil @media (max-width: 768px) bloğunun içinde olmalı', () => {
    const lastMobileMediaIndex = pageCss.lastIndexOf('@media (max-width: 768px)');
    const sealPaperRgbIndex = pageCss.indexOf('--seal-paper-rgb:');
    expect(lastMobileMediaIndex).toBeGreaterThan(-1);
    expect(sealPaperRgbIndex).toBeGreaterThan(lastMobileMediaIndex);
  });
});

describe('kat dilimi şeridi kapsamı', () => {
  it('.mobileAccordions .drawerRow::before selektörü tanımlı olmalı', () => {
    expect(pageCss).toMatch(/\.mobileAccordions\s+\.drawerRow::before/);
  });

  it('çıplak .drawerRow::before (mobileAccordions olmadan) TANIMLI OLMAMALI', () => {
    // .mobileAccordions .drawerRow::before dışında hiçbir yerde bare .drawerRow::before olmamalı
    const bareRulePattern = /(?<!\.mobileAccordions\s)\.drawerRow::before/g;
    const matches = pageCss.match(bareRulePattern) ?? [];
    expect(matches.length).toBe(0);
  });
});

describe('paylaşılan bileşen override\'larının özgünlük deseni', () => {
  it('Rapor Kaydet/PDF İndir butonları element+class selektörüyle override edilmeli (bkz. compareBtn hata geçmişi)', () => {
    expect(pageCss).toMatch(/button\.sealPrimaryBtn/);
    expect(pageCss).toMatch(/button\.sealOutlineBtn/);
  });

  it('mobil RangeSlider brass override\'ı input\\[type="range"\\] elementine scope\'lanmalı', () => {
    expect(pageCss).toMatch(/\.sealRangeSlider input\[type="range"\]/);
  });
});

describe('tekrarlayan sonuç/slider gizleme kapsamı', () => {
  it('.blueBox mobilde gizlenmeli, kural mobil media query içinde olmalı', () => {
    const lastMobileMediaIndex = pageCss.lastIndexOf('@media (max-width: 768px)');
    const blueBoxHideMatch = pageCss.match(/\.blueBox\s*\{[^}]*display:\s*none/);
    expect(blueBoxHideMatch).not.toBeNull();
    expect(blueBoxHideMatch!.index).toBeGreaterThan(lastMobileMediaIndex);
  });

  it('.sliderArea mobilde gizlenmeli, kural mobil media query içinde olmalı', () => {
    const lastMobileMediaIndex = pageCss.lastIndexOf('@media (max-width: 768px)');
    const sliderAreaHideMatch = pageCss.match(/\.sliderArea\s*\{[^}]*display:\s*none/);
    expect(sliderAreaHideMatch).not.toBeNull();
    expect(sliderAreaHideMatch!.index).toBeGreaterThan(lastMobileMediaIndex);
  });
});

describe('mainPanelResults gate kapsamı', () => {
  it('.mainPanelResults yalnızca data-revealed="false" iken mobilde gizlenmeli', () => {
    const lastMobileMediaIndex = pageCss.lastIndexOf('@media (max-width: 768px)');
    const match = pageCss.match(/\.container\[data-revealed="false"\]\s+\.mainPanelResults\s*\{[^}]*display:\s*none/);
    expect(match).not.toBeNull();
    expect(match!.index).toBeGreaterThan(lastMobileMediaIndex);
  });
});

describe('summaryPanel gate kapsamı', () => {
  it('.summaryPanel yalnızca data-revealed="false" iken mobilde gizlenmeli', () => {
    const lastMobileMediaIndex = pageCss.lastIndexOf('@media (max-width: 768px)');
    const match = pageCss.match(/\.container\[data-revealed="false"\]\s+\.summaryPanel\s*\{[^}]*display:\s*none/);
    expect(match).not.toBeNull();
    expect(match!.index).toBeGreaterThan(lastMobileMediaIndex);
  });
});

describe('aksiyon butonları dual-slot kapsamı', () => {
  it('.desktopActionsSlot mobilde gizlenmeli', () => {
    const lastMobileMediaIndex = pageCss.lastIndexOf('@media (max-width: 768px)');
    const match = pageCss.match(/\.desktopActionsSlot\s*\{[^}]*display:\s*none/);
    expect(match).not.toBeNull();
    expect(match!.index).toBeGreaterThan(lastMobileMediaIndex);
  });

  it('.mobileActionsSlot yalnızca data-revealed="true" iken mobilde görünmeli', () => {
    expect(pageCss).toMatch(/\.container\[data-revealed="true"\]\s+\.mobileActionsSlot\s*\{[^}]*display:\s*contents/);
  });
});
