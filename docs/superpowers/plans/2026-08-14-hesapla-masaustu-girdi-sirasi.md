# Hesapla Masaüstü Girdi Sırası Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Masaüstü `/hesapla` sidebar'ının girdi kartı sırasını mobille aynı sıraya getirmek (Konum → Arsa Alanı → Daire Standardı → Daire m² → Birim İnşaat Maliyeti → Arsa Payı(tek blok) → Deprem Riski) ve arsa payının iki ayrı kontrol noktasını (sidebar'daki toggle + `<main>`'deki ayrı yüzde slider'ı) tek bir bloğa birleştirmek.

**Architecture:** `SmartContextCard` sarmalayıcısı (Konum+Risk+Alan'ı SABİT sırada birleştiren) kullanımdan kaldırılır; `page.tsx` mobilin zaten kullandığı `LocationHeader`/`AreaSection`/`RiskSection` alt-bileşenlerini kendi sırasında doğrudan render eder. Arsa payı yüzde slider'ının `<main>`'deki JSX'i sidebar'daki mevcut toggle bloğuna taşınır (kopyalanır, davranış birebir korunur).

**Tech Stack:** Next.js 16, React 19, TypeScript, Jest + Testing Library.

## Global Constraints

- Görsel dil (renkler, kart border-radius/shadow, tipografi) DEĞİŞMEYECEK — yalnızca sıralama ve arsa payı bloğunun birleşmesi.
- Gelişmiş Ayarlar paneli (Piyasa Fiyatı/İksa/Müteahhit Kazancı) DOKUNULMAYACAK.
- `RiskSection`/`AreaSection`/`LocationHeader` bileşenlerinin KENDİ içi DEĞİŞMEYECEK — yalnızca sayfadaki konumları/sırası değişiyor.
- Mobil (`GirdiKarti.tsx`, `HesaplaMobile.tsx`) DOKUNULMAYACAK.
- Her adımda tsc 0 hata + jest tüm proje yeşil kalacak.

---

### Task 1: Sidebar'ı yeniden sırala, Arsa Payı'nı tek bloğa birleştir

**Files:**
- Modify: `src/app/hesapla/page.tsx`
- Test: `src/app/hesapla/page.test.tsx`

**Interfaces:**
- Consumes: `LocationHeader`, `AreaSection`, `RiskSection` (`./SmartContextCardSections`, zaten var, imzaları değişmiyor).
- Bu task `SmartContextCard` importunu KALDIRIR ama `SmartContextCard.tsx` dosyasının kendisini SİLMEZ (Task 2'nin işi) — böylece bu task tek başına derlenebilir/test edilebilir kalır.

- [ ] **Step 1: Write the failing test — kart sırası regresyonu**

`src/app/hesapla/page.test.tsx`'e, dosyanın sonuna (son `describe` bloğunun kapanışından SONRA) ekle:

```tsx
describe('/hesapla — masaüstü girdi kartı sırası mobille aynı (denetim sonrası UX düzeltmesi)', () => {
    it('sidebar başlıkları Konum→Arsa Alanı→Daire Standardı→Daire m²→Birim Maliyet→Arsa Payı→Deprem Riski sırasında render edilir', async () => {
        viewportKur(true)
        render(<HesaplaPage />)
        const sidebar = await screen.findByText('Proje Bilgileri')
        const container = sidebar.closest('.desktopSidebar') as HTMLElement

        // Her bölümün kendine özgü, tekil bir metnini sırayla ara — DOM
        // sırasını dolaylı olarak kanıtlar (data-girdi-blok attribute'u
        // LocationHeader/AreaSection/RiskSection'ın kendi ust div'inde
        // zaten var, SmartContextCardSections.tsx'te tanımlı).
        const beklenenSira = [
            '[data-girdi-blok="konum"]',
            '[data-girdi-blok="arsa-alani"]',
        ]
        const html = container.innerHTML
        const indeksler = beklenenSira.map(sel => {
            // querySelector ile DOM sirasindaki gercek pozisyonu bul.
            const el = container.querySelector(sel)
            expect(el).not.toBeNull()
            return Array.from(container.querySelectorAll('*')).indexOf(el as Element)
        })
        for (let i = 1; i < indeksler.length; i++) {
            expect(indeksler[i]).toBeGreaterThan(indeksler[i - 1])
        }

        // Metin bazlı sıralama: baslik metinleri DOM sirasinda bu sekilde gorunmeli.
        const baslikMetinleri = ['Daire Standardı', 'Ortalama Daire Metrekaresi', 'Birim inşaat maliyeti', 'Deprem Riski']
        const pozisyonlar = baslikMetinleri.map(metin => html.indexOf(metin))
        pozisyonlar.forEach(p => expect(p).toBeGreaterThan(-1))
        for (let i = 1; i < pozisyonlar.length; i++) {
            expect(pozisyonlar[i]).toBeGreaterThan(pozisyonlar[i - 1])
        }

        // Deprem Riski SIDEBAR'IN SON kartı olmalı — Birim Maliyet'ten SONRA.
        const birimMaliyetPos = html.indexOf('Birim inşaat maliyeti')
        const depremPos = html.indexOf('Deprem Riski')
        expect(depremPos).toBeGreaterThan(birimMaliyetPos)
    })

    it('SmartContextCard artik render edilmiyor (sidebar dogrudan alt-bilesenleri kullaniyor)', async () => {
        viewportKur(true)
        render(<HesaplaPage />)
        await screen.findByText('Proje Bilgileri')
        // SmartContextCard.module.css'in KENDINE OZGU container class'i
        // (identity-obj-proxy ile literal class adi olarak eslenir).
        expect(document.querySelector('.container[class*="SmartContextCard"]')).toBeNull()
    })
})

describe('/hesapla — masaüstü Arsa Payı TEK blokta (denetim sonrası UX düzeltmesi)', () => {
    it('main icinde eski ayrı "Arsa Payı" yüzde slider'ı artık YOK', async () => {
        viewportKur(true)
        const user = userEvent.setup()
        render(<HesaplaPage />)
        await user.click(await screen.findByRole('button', { name: /Örnek Proje ile Dene/i }))
        const main = screen.getByText('Hesap Sonuçları Engine v2').closest('main') as HTMLElement
        // Eski konumda yuzde slider'i ARTIK OLMAMALI (sidebar'a tasindi).
        expect(within(main).queryByLabelText('Arsa payı yüzdesi')).toBeNull()
    })

    it('yüzde modunda (toggle kapalı) sidebar\'daki tek blokta yüzde slider\'ı çalışır', async () => {
        viewportKur(true)
        const user = userEvent.setup()
        render(<HesaplaPage />)
        await user.click(await screen.findByRole('button', { name: /Örnek Proje ile Dene/i }))

        const sidebar = screen.getByText('Proje Bilgileri').closest('.desktopSidebar') as HTMLElement
        const slider = within(sidebar).getByLabelText('Arsa payı yüzdesi')
        fireEvent.change(slider, { target: { value: '45' } })
        expect(slider).toHaveValue('45')
    })

    it('daire-sayısı modunda (toggle açık) sidebar\'daki tek blokta türetilmiş yüzde notu görünür', async () => {
        viewportKur(true)
        const user = userEvent.setup()
        render(<HesaplaPage />)
        await user.click(await screen.findByRole('button', { name: /Örnek Proje ile Dene/i }))

        const toggleRow = screen.getByText('Toplam Daire Sayısı').closest('div') as HTMLElement
        await user.click(within(toggleRow).getByRole('checkbox'))

        // Varsayilan totalApartments=24, ownerApartmentShare=0 -> %0
        expect(await screen.findByText(/Arsa payı.*%0.*olarak hesaplanıyor/)).toBeInTheDocument()
    })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/app/hesapla/page.test.tsx -t "masaüstü girdi kartı sırası\|Arsa Payı TEK"`
Expected: FAIL — sıra hâlâ eski (Daire Standardı ilk, Deprem Riski ortada), eski yüzde slider'ı hâlâ `<main>`'de, sidebar'da türetilmiş yüzde notu yok.

- [ ] **Step 3: `page.tsx`'i yeniden düzenle**

**3a.** Import satırını güncelle — `SmartContextCard` yerine alt-bileşenleri içe aktar:

```tsx
import { LocationHeader, AreaSection, RiskSection } from './SmartContextCardSections';
```

(satır 28'deki `import { SmartContextCard } from './SmartContextCard';` satırını BUNUNLA DEĞİŞTİR.)

**3b.** Sidebar JSX'ini (satır 629-719 civarı, `<div className={styles.desktopSidebar}>`'dan `</div>`'e kadar) TAMAMEN şu içerikle DEĞİŞTİR:

```tsx
          <div className={styles.desktopSidebar}>
            <div className={styles.sidebarTitle}>Proje Bilgileri</div>

            <div className={styles.settingsGroup}>
              <LocationHeader parcelContext={parcelContext} onOpenMap={() => setIsParcelModalOpen(true)} />
            </div>

            <div className={styles.settingsGroup}>
              <AreaSection
                parcelContext={parcelContext}
                arsaAlani={arsaAlani}
                onArsaAlani={setArsaAlani}
                isAaEnabled={isAaEnabled}
                onIsAaEnabled={setIsAaEnabled}
              />
            </div>

            <div className={styles.settingsGroup}>
              <h4>Daire Standardı</h4>
              <div className={styles.luxGrid}>
                {[
                  { tier: 'standart' as const, label: 'Standart', icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3L2 12h3v8h14v-8h3L12 3zm0 2.84L17.5 12h-11L12 5.84z" /></svg> },
                  { tier: 'orta' as const, label: 'Orta', icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><path d="M3 21h18v-2H3v2zm6-4h6V5H9v12zm8 0h6v-8h-6v8zm-16 0h6v-6H1v6z" /></svg> },
                  { tier: 'luks' as const, label: 'Lüks', icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><path d="M5 21h14V3H5v18zm2-14h2v2H7V7zm0 4h2v2H7v-2zm0 4h2v2H7v-2zm4-8h2v2h-2V7zm0 4h2v2h-2v-2zm0 4h2v2h-2v-2z" /><circle cx="17.5" cy="5.5" r="3.5" fill="#4ade80" /><path d="M16 6l1 1 2-2" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg> }
                ].map(opt => (
                  <div key={opt.label} className={`${styles.luxBox} ${luxTier === opt.tier ? styles.luxBoxActive : ''}`} onClick={() => setLuxTier(opt.tier)}>
                    {opt.icon}
                    <span>{opt.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.settingsGroup}>
              <h4>Ortalama Daire Metrekaresi</h4>
              <div className={styles.stepperInput}>
                <input
                  type="number"
                  value={apartmentSize ?? ''}
                  onChange={(e) => handleApartmentSizeChange(e.target.value === '' ? null : Number(e.target.value))}
                />
                <div className={styles.stepperRight}>
                  <span>m²</span>
                  <button onClick={() => { if (apartmentSize !== null) handleApartmentSizeChange(Math.max(50, apartmentSize - 5)); }}>−</button>
                  <button onClick={() => handleApartmentSizeChange(apartmentSize === null ? ORNEK_APARTMENT_SIZE : apartmentSize + 5)}>+</button>
                </div>
              </div>
            </div>

            <div className={styles.settingsGroup}>
              <BirimMaliyetField
                globalUnitPrice={globalUnitPrice}
                birimMaliyetKaynagi={birimMaliyetKaynagi}
                onBirimMaliyet={handleGlobalUnitPriceChange}
              />
            </div>

            <div className={styles.settingsGroup}>
              <div className={styles.toggleRow}>
                <h4>Arsa Payı</h4>
                <Toggle checked={isApartmentCountEnabled} onChange={(e) => setIsApartmentCountEnabled(e.target.checked)} />
              </div>
              {isApartmentCountEnabled ? (
                <>
                  <div className={styles.stepperInput}>
                    <input type="number" value={totalApartments} onChange={(e) => setTotalApartments(Number(e.target.value))} />
                    <div className={styles.stepperRight}>
                      <span>daire</span>
                      <button onClick={() => setTotalApartments(p => Math.max(1, p - 1))}>−</button>
                      <button onClick={() => setTotalApartments(p => p + 1)}>+</button>
                    </div>
                  </div>
                  <RangeSlider
                    label="Arsa Sahibine Düşen Daire"
                    aria-label="Arsa Sahibine Düşen Daire"
                    min={0}
                    max={Math.max(totalApartments - 1, 0)}
                    step={1}
                    value={ownerApartmentShare}
                    unit="daire"
                    onChange={(e) => setOwnerApartmentShare(Number(e.target.value))}
                  />
                  {/* Salt-okunur turetilmis yuzde notu — mobildeki
                      "Arsa payı %X olarak hesaplanıyor" ile ayni gerekce:
                      Sd acikken tek gercek kaynak ownerApartmentShare/
                      totalApartments'tir, yuzde AYRICA duzenlenemez. */}
                  <p className={styles.sliderValueBox}>
                    Arsa payı %{Math.round(effectiveLandShareRatio)} olarak hesaplanıyor.
                  </p>
                </>
              ) : (
                <div className={styles.sliderContainer}>
                  <div className={styles.sliderTrackWrapper}>
                    <div className={styles.sliderTrack} style={{ '--share-pct': `${((landShareRatio - 10) / 90) * 100}%` } as React.CSSProperties}>
                      <div className={`${styles.sliderFill} ${styles.sliderFillDynamic}`}></div>
                      <div className={`${styles.sliderThumb} ${styles.sliderThumbDynamic}`}></div>
                      <input
                        type="range" min="10" max="100"
                        value={landShareRatio}
                        onChange={(e) => setLandShareRatio(Number(e.target.value))}
                        className={styles.sliderInput}
                        aria-label="Arsa payı yüzdesi"
                      />
                      <div className={styles.sliderTicks}>
                        <span>10%</span>
                        <span>100%</span>
                      </div>
                    </div>
                  </div>
                  <div className={styles.sliderValueBox}>{landShareRatio}%</div>
                </div>
              )}
            </div>

            <div className={styles.settingsGroup}>
              <RiskSection riskLevel={riskLevel} riskLevels={riskLevels} onRiskLevel={handleRiskLevel} riskKaynagi={riskKaynagi} />
            </div>
          </div>
```

Notlar:
- `aria-label="Arsa payı yüzdesi"` yüzde `<input type="range">`'e YENİ eklendi — eski JSX'te yoktu (mobildeki `aria-label="Arsa payı yüzdesi"` ile TUTARLI hale getirildi, testte bu label ile sorgulanabilmesi için gerekli).
- `styles.sliderValueBox` (page.module.css'te zaten var, eski yüzde slider'ının değer kutusunda kullanılıyordu) türetilmiş yüzde notu için YENİDEN KULLANILIYOR — yeni bir CSS class'ı gerekmiyor.
- "Toplam Daire Sayısı" başlığı "Arsa Payı" olarak DEĞİŞTİRİLDİ (blok artık ikisini birden temsil ediyor).

**3c.** `<main>` içindeki eski "Arsa Payı" bloğunu (`<div className={styles.sliderArea}>...</div>`, `<h4 className={styles.sliderHeader}>Arsa Payı</h4>` içeren blok, `{actionsSection}`'dan hemen ÖNCE) TAMAMEN SİL:

```tsx
            <div className={styles.sliderArea}>
              <h4 className={styles.sliderHeader}>Arsa Payı</h4>
              {isApartmentCountEnabled ? (
                <div className={styles.sliderValueBox}>
                  %{Math.round(effectiveLandShareRatio)} ({ownerApartmentShare}/{totalApartments} daire)
                </div>
              ) : (
                <div className={styles.sliderContainer}>
                  <div className={styles.sliderTrackWrapper}>
                    <div className={styles.sliderTrack} style={{ '--share-pct': `${((landShareRatio - 10) / 90) * 100}%` } as React.CSSProperties}>
                      <div className={`${styles.sliderFill} ${styles.sliderFillDynamic}`}></div>
                      <div className={`${styles.sliderThumb} ${styles.sliderThumbDynamic}`}></div>
                      <input
                        type="range" min="10" max="100"
                        value={landShareRatio}
                        onChange={(e) => setLandShareRatio(Number(e.target.value))}
                        className={styles.sliderInput}
                      />
                      <div className={styles.sliderTicks}>
                        <span>10%</span>
                        <span>100%</span>
                      </div>
                    </div>
                  </div>
                  <div className={styles.sliderValueBox}>{landShareRatio}%</div>
                </div>
              )}
            </div>

```

(Bu bloğun hemen üstündeki ve altındaki kod — `Örnek Proje ile Dene` butonu bloğu ve `{actionsSection}` — DOKUNULMADAN kalır, aralarındaki boşluk tek bir boş satıra iner.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/app/hesapla/page.test.tsx`
Expected: TÜM testler (yeni + mevcut) PASS. Mevcut testlerden biri kırılırsa (örn. `within(sidebar)` ile eski bir başlık arayan bir test), o testin sorgusunu YENİ konuma göre güncelle — DAVRANIŞ testin BEKLEDİĞİNDEN farklıysa değil, yalnızca DOM KONUMU değiştiği için kırılıyorsa.

- [ ] **Step 5: `npx tsc --noEmit` çalıştır, 0 hata olduğunu doğrula**

- [ ] **Step 6: Commit**

```bash
git add src/app/hesapla/page.tsx src/app/hesapla/page.test.tsx
git commit -m "refactor(hesapla): masaustu girdi sirasi mobille ayni sıraya getirildi, arsa payi tek bloga birlestirildi"
```

---

### Task 2: Ölü `SmartContextCard` sarmalayıcısını sil, final doğrulama

**Files:**
- Delete: `src/app/hesapla/SmartContextCard.tsx`
- Delete: `src/app/hesapla/SmartContextCard.test.tsx`
- Delete: `src/app/hesapla/SmartContextCard.styles.scope.test.ts`
- Modify (olası): `src/app/hesapla/SmartContextCard.module.css` — YALNIZCA `SmartContextCard.tsx`'e özel `.container` kuralı varsa o silinir; `LocationHeader`/`AreaSection`/`RiskSection`'ın KENDİ kullandığı sınıflar (mobil dahil) bu dosyada KALIR, SİLİNMEZ.

**Interfaces:**
- Consumes: Task 1'in tamamlanmış hali (artık hiçbir yerden `SmartContextCard` import edilmiyor).

- [ ] **Step 1: Kalan referansları doğrula**

Run: `grep -rn "SmartContextCard'" src/ --include=*.tsx --include=*.ts | grep -v "SmartContextCardSections"`
Expected: Yalnızca silinecek 3 dosyanın kendi içindeki self-referanslar (varsa) — `page.tsx` artık HİÇ eşleşmemeli (Task 1'de import değiştirildi).

- [ ] **Step 2: `SmartContextCard.module.css`'i incele**

`src/app/hesapla/SmartContextCard.module.css`'i oku. Yalnızca `.container` (ve varsa `SmartContextCard.tsx`'e özgü, `LocationHeader`/`AreaSection`/`RiskSection`'ın KULLANMADIĞI başka bir sınıf) siliniyor mu diye kontrol et — `SmartContextCardSections.tsx`'teki (`.header`, `.riskSection`, `.areaSection` vb.) TÜM sınıflar, mobil `@media` override'ları DAHİL, KORUNUYOR. `.container` sınıfının SmartContextCardSections.tsx içinde KULLANILMADIĞINI grep ile doğrula:

Run: `grep -n "styles.container" src/app/hesapla/SmartContextCardSections.tsx`
Expected: Eşleşme YOK (yalnızca `SmartContextCard.tsx` kullanıyordu).

- [ ] **Step 3: Dosyaları sil**

```bash
git rm src/app/hesapla/SmartContextCard.tsx src/app/hesapla/SmartContextCard.test.tsx src/app/hesapla/SmartContextCard.styles.scope.test.ts
```

`SmartContextCard.module.css`'ten YALNIZCA `.container { ... }` kuralını (Step 2'de doğrulanan, başka hiçbir yerde kullanılmayan kural) sil — dosyanın geri kalanı DOKUNULMADAN kalır.

- [ ] **Step 4: Tüm proje test + tip kontrolü**

Run: `npx tsc --noEmit`
Expected: 0 hata (silinen dosyalara hiçbir import kalmamalı).

Run: `npx jest`
Expected: TÜM proje suite'i yeşil. Silinen `SmartContextCard.test.tsx`/`SmartContextCard.styles.scope.test.ts` artık koşulmuyor (dosya yok) — bu, test SAYISININ bir önceki turdan biraz DÜŞMESİ demektir, bu BEKLENEN bir durumdur (ölü kod + ona ait testler birlikte kalktı), bir regresyon DEĞİLDİR.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore(hesapla): olu SmartContextCard sarmalayicisi silindi (artik hicbir yerden render edilmiyor)"
```

---

## Final Doğrulama (planın sonunda)

- `npx tsc --noEmit` → 0 hata.
- `npx jest` → tüm proje suite'i yeşil.
- Playwright ile (localhost dev server, 1440×900) gerçek sayfa render'ında: sidebar sırasının (Konum→Arsa Alanı→Daire Standardı→Daire m²→Birim Maliyet→Arsa Payı→Deprem Riski) ekran görüntüsüyle doğrulanması, Arsa Payı bloğunun her iki modda da (toggle açık/kapalı) çalıştığının doğrulanması.
- Mobil (`GirdiKarti.tsx`, `HesaplaMobile.tsx`) test suite'inin (`npx jest src/app/hesapla/mobile`) DEĞİŞMEDEN yeşil kaldığının doğrulanması — bu plan mobile dokunmuyor.
