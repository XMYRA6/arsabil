# Hesapla Mobil Girdi Kartı — Alan Sırası + Birim Maliyet'in Ana Karta Taşınması

**Tarih:** 2026-08-13
**Durum:** Onaylandı (mockup üzerinden), plan aşamasına geçiliyor.

## Bağlam

Kullanıcı bulgusu: mobil `/hesapla`'da Deprem Riski, Arsa Alanı/Yapı Standardı/Daire
Büyüklüğü gibi temel boyut/maliyet girdilerinden ÖNCE soruluyor — bir müteahhit
açısından "arsayı/binayı tanımlamadan risk sormak" mantıksız geliyor. Kod okuması
bunu doğruladı: `hasEnoughDataForResult = apartmentSize !== null && globalUnitPrice
!== null` (`page.tsx:253`) — Deprem Riski sonuç almak için hiç gerekli değil,
salt bir düzeltme faktörü.

Sohbet sırasında ikinci, daha ciddi bir bulgu ortaya çıktı: boş durum metni
"Sonuçları görmek için daire m² ve birim maliyeti girin" diyor, ama bu iki
ZORUNLU alandan yalnızca biri (Daire Büyüklüğü) ana kartta görünür — diğeri
(`globalUnitPrice`, "Birim İnşaat Maliyeti") yalnızca "Gelişmiş Ayarlar"
yaprağında. Mesajın kendisiyle çelişen bir tasarım.

Bir müteahhit/inşaat mühendisi perspektifinden doğru karar sırası tartışıldı ve
onaylandı: **Konum → Arsa Alanı → Yapı Standardı → Daire Büyüklüğü → Birim
İnşaat Maliyeti → Arsa Payı → Deprem Riski**. Risk gizlenmiyor, yalnızca sırası
değişiyor (foundational girdilerden SONRA gelen bir düzeltme olarak).

Mockup (onaylandı): https://claude.ai/code/artifact/22ee1af1-3af6-4514-89a8-df5d12a4601c
(ana kart sırası + "Gelişmiş Ayarlar" modalının kalan alanlarının yeniden
gruplanması — İksa Masrafı öne alınır çünkü Deprem Riski ile aynı "zemin riski"
ailesi, Müteahhit Kazancı sona iner çünkü maliyet zincirinin son kararı, Piyasa
Fiyatı kendi "Karşılaştırma" bölümüne ayrılır).

Ayrı bir sohbet turunda üçüncü bir bulgu: `BirimMaliyetField`'i olduğu gibi ana
karta taşımak, az önce (2026-08-12 turunda) kapatılan sınıftan bir hatayı
yeniden açar — bu bileşen `page.module.css` (masaüstü token'ları) kullanıyor,
mobil cam kartın yanında düz masaüstü input'u gibi duracaktı. Kullanıcı "Liquid
Glass'a uygun kendi görselini yazalım" dedi — bu spec'in kapsamı bunu içeriyor.

## Kapsam

1. **`SmartContextCard`'ın üç bölümü ayrıştırılır** (`LocationHeader`,
   `RiskSection`, `AreaSection`) — yeni dosya `SmartContextCardSections.tsx`.
   `SmartContextCard.tsx` bu üçünü ORİJİNAL sırayla (konum→risk→alan)
   birleştiren ince bir sarmalayıcıya döner — **masaüstü (`page.tsx:696`)
   hiç değişmez**, aynı `<SmartContextCard .../>` çağrısını kullanmaya devam
   eder, çıktısı piksel-eşdeğer kalır.
2. **`GirdiKarti.tsx`** artık `<SmartContextCard>`'ı DEĞİL, üç alt-bölümü
   doğrudan kendi yeni sırasında kullanır: `LocationHeader` → `AreaSection` →
   Yapı Standardı → Daire Büyüklüğü → **Birim İnşaat Maliyeti (yeni)** → Arsa
   Payı modu → `RiskSection`.
3. **Ortak tamponlu-input hook'u** (`useBufferedNumberInput`) — `BirimMaliyetField`
   (`AdvancedSettingsSections.tsx`) içindeki mevcut "silme sırasında değer geri
   sıçramaz" mantığı buraya çıkarılır, davranış BİREBİR korunur (mevcut 5 test
   değişmeden geçer). Yeni mobil Birim Maliyet alanı da aynı hook'u kullanır.
4. **Yeni mobil Birim Maliyet UI'ı** — `GirdiKarti` içinde, `mobile.module.css`
   Liquid Glass token'larıyla (Daire Büyüklüğü'nün kenarlık-kontrastlı stepper
   satırıyla aynı görsel dil), `BirimMaliyetField`'ın JSX'i DEĞİL, kendi mobile
   özel markup'ı.
5. **`Gelişmiş Ayarlar` yaprağı yeniden gruplanır:**
   - `<BirimMaliyetField>` çağrısı `GelismisAyarlarSheet.tsx`'ten TAMAMEN
     kalkar (ana karta taşındığı için burada tekrar etmiyor).
   - `RiskCostFields` (`AdvancedSettingsSections.tsx`) içindeki İksa Masrafı /
     Müteahhit Kazancı blokları yer değiştirir (İksa önce). Bu bileşen
     YALNIZCA mobil yaprakta kullanılıyor (araştırmayla doğrulandı) — masaüstü
     aynı iki alanı `page.tsx`'te BAĞIMSIZ kendi JSX'iyle tekrar ediyor,
     dolayısıyla bu değişiklik masaüstünü hiç etkilemiyor.
   - "Piyasa fiyatı" `aria-label`'ı "Piyasa karşılaştırması"na değişir (artık
     yalnızca `MarketField`/Yaklaşık Piyasa Fiyatı içeriyor).
6. **`page.tsx`** — `girdi={{...}}` nesnesine (`page.tsx:549-565`) üç yeni alan
   eklenir: `globalUnitPrice`, `birimMaliyetKaynagi`, `onBirimMaliyet:
   handleGlobalUnitPriceChange`. Üçü de zaten var olan state/handler'lar,
   yeni bir şey YARATILMIYOR. `<GelismisAyarlarSheet>` çağrısındaki
   `globalUnitPrice`/`birimMaliyetKaynagi`/`onBirimMaliyet` prop'ları
   (`page.tsx:605-607`) kalkar (yaprak artık bunlara ihtiyaç duymuyor).

## Kapsam dışı (bu turda YAPILMIYOR)

- **Masaüstü `/hesapla` sayfasının sidebar/sütun dengesizliği** — ayrı, çok
  daha büyük bir bulgu (canlı ekran görüntüsüyle doğrulandı: sol sidebar
  1425px, orta/sağ sütunlar 805px'te bitiyor, altlarında 600px+ boş alan).
  Kullanıcı açıkça "önce mobil" dedi — bu tamamen ayrı bir spec/plan
  gerektirecek.
- Masaüstü `/hesapla`'nın alan sırası veya "Gelişmiş Ayarlar" panelinin kendi
  sırası (`page.tsx:628+` `desktopSidebar`) — hiç dokunulmuyor.
- Deprem Riski + İksa Masrafı'nın aynı ekranda/bölümde birleştirilmesi —
  kavramsal olarak aynı aile oldukları tartışıldı ama şu an iki ayrı UI
  yüzeyinde (ana kart / Gelişmiş Ayarlar yaprağı) kalmaya devam ediyorlar,
  yalnızca KENDİ yüzeylerindeki sıraları değişiyor.
- `GelismisAyarlarSheet`'e görünür bölüm başlıkları eklemek — şu an bölümler
  yalnızca `aria-label` ile gruplanıyor (görünür `<h3>` yok); bu davranış
  korunuyor, yeni bir görsel eleman eklenmiyor.
- Motor/hesaplama mantığı — birebir korunuyor, yalnızca render ve prop
  akışı değişiyor.

## Token/davranış karşılığı

| Kullanım | Kaynak | Not |
|---|---|---|
| Yeni Birim Maliyet satırı zemini | `rgba(11,32,54,.055)` + `1px solid rgba(11,32,54,.07)` | 2026-08-12'de onaylanan "kenarlık kontrastı" değeriyle BİREBİR aynı (`.stepperSatir`, `.riskSection`/`.areaSection` ile tutarlı) |
| Değer metni | `font-size:16px` (iOS zoom guard), `font-weight:800`, `color:var(--m-ink)` | `.stepperInput` ile aynı desen |
| Birim etiketi ("TL/m²") | `font-size:12px; font-weight:700; color:var(--m-body)` | `.stepperBirim` ile aynı |
| Kaynak etiketi ("Varsayılan"/"Elle girildi") | `.girdiEtiketKaynak` (yeni), `color:var(--m-body)`, normal case | `.girdiEtiket`in içine gömülü ikincil metin |

**Kritik kısıt (tekrarlanan proje kuralı):** Yeni mobil kurallar `mobile.module.css`'in
TEK büyük `@media (max-width:768px)` bloğunun İÇİNDE kalmalı (`mobileStyles.scope.test.ts`
guard'ı bunu zorunlu kılıyor). `var(--fg)`/`var(--label-color)`/`var(--muted)`
KULLANILMAMALI.

## Değişiklikler

### 1. Yeni dosya: `src/app/hesapla/useBufferedNumberInput.ts`

```ts
"use client";

import { useState } from 'react';

/**
 * Bir `number | null` degeri kontrollu bir metin input'u olarak tamponlar.
 * `value`e dogrudan baglanmak (`String(value)`) kullaniciyi alani SILEMEZ
 * hale getirir: `Number('') === 0` guard'i gecemedigi icin commit hic
 * olmaz, React input'u HEMEN eski degere geri yazar (review Finding 2,
 * 2026-07-30, BirimMaliyetField'ta bulunmustu). Yerel `girdi` string
 * state'i bu sicramayi onler: ham metin HER ZAMAN gosterilir, yalnizca
 * gecerli (>0) bir sayi girildiginde `onChange`e commit edilir. Dis
 * kaynakli deger degisiklikleri (parent'tan geri akan prop) render
 * SIRASINDA yakalanir.
 */
export function useBufferedNumberInput(
    value: number | null,
    onChange: (v: number) => void,
) {
    const [girdi, setGirdi] = useState<string>(value === null ? '' : String(value));
    const [oncekiDeger, setOncekiDeger] = useState<number | null>(value);
    if (value !== oncekiDeger) {
        setOncekiDeger(value);
        setGirdi(value === null ? '' : String(value));
    }

    const handleChange = (raw: string) => {
        setGirdi(raw);
        const v = Number(raw);
        if (Number.isFinite(v) && v > 0) {
            onChange(v);
        }
    };

    return { girdi, handleChange };
}
```

Bu, `BirimMaliyetField`'ın (`AdvancedSettingsSections.tsx:111-153`) mevcut
`girdi`/`oncekiFiyat` state çiftinin ve `onChange` içindeki `raw`/`v`
mantığının BİREBİR (satır satır) taşınmış hâli — yeni bir davranış icat
edilmiyor.

### 2. `AdvancedSettingsSections.tsx` — `BirimMaliyetField` hook'u kullanır

**2a. Import satırı.** Ara (`AdvancedSettingsSections.tsx:3`):

```tsx
import React, { useState } from 'react';
```

Yeni:

```tsx
import React from 'react';
import { useBufferedNumberInput } from './useBufferedNumberInput';
```

**2b. `BirimMaliyetField` gövdesi.** Ara (bul ve değiştir, `AdvancedSettingsSections.tsx:111-146`):

```tsx
export function BirimMaliyetField({ globalUnitPrice, birimMaliyetKaynagi, onBirimMaliyet }: BirimMaliyetFieldProps) {
  const [girdi, setGirdi] = useState<string>(globalUnitPrice === null ? '' : String(globalUnitPrice));
  const [oncekiFiyat, setOncekiFiyat] = useState<number | null>(globalUnitPrice);
  if (globalUnitPrice !== oncekiFiyat) {
    setOncekiFiyat(globalUnitPrice);
    setGirdi(globalUnitPrice === null ? '' : String(globalUnitPrice));
  }

  return (
    <div className={`${styles.drawerRow} ${styles.column}`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--label-color)' }}>Birim inşaat maliyeti</span>
        <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600 }}>{kaynakEtiketi(birimMaliyetKaynagi, globalUnitPrice)}</span>
      </div>
      <div className={styles.stepperInput}>
        <input
          type="number"
          min={0}
          step={100}
          value={girdi}
          aria-label="Birim inşaat maliyeti (TL/m²)"
          onChange={e => {
            const raw = e.target.value;
            setGirdi(raw);
            const v = Number(raw);
            if (Number.isFinite(v) && v > 0) {
              onBirimMaliyet(v);
            }
          }}
        />
        <div className={styles.stepperRight}>
          <span>TL/m²</span>
        </div>
      </div>
    </div>
  );
}
```

Yeni:

```tsx
export function BirimMaliyetField({ globalUnitPrice, birimMaliyetKaynagi, onBirimMaliyet }: BirimMaliyetFieldProps) {
  const { girdi, handleChange } = useBufferedNumberInput(globalUnitPrice, onBirimMaliyet);

  return (
    <div className={`${styles.drawerRow} ${styles.column}`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--label-color)' }}>Birim inşaat maliyeti</span>
        <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600 }}>{kaynakEtiketi(birimMaliyetKaynagi, globalUnitPrice)}</span>
      </div>
      <div className={styles.stepperInput}>
        <input
          type="number"
          min={0}
          step={100}
          value={girdi}
          aria-label="Birim inşaat maliyeti (TL/m²)"
          onChange={e => handleChange(e.target.value)}
        />
        <div className={styles.stepperRight}>
          <span>TL/m²</span>
        </div>
      </div>
    </div>
  );
}
```

(Import değişikliği 2a'da zaten yapıldı — `useState`'i yalnızca `BirimMaliyetField`
kullanıyordu, `RiskCostFields`/`MarketField` state almıyor, prop'larla çalışıyor;
doğrulandı, dosyanın tamamı okundu, `useState` başka yerde geçmiyor.)

**Davranış SIFIR fark:** `AdvancedSettingsSections.test.tsx`'teki 5 test
(başlangıç değeri, silme, yeniden yazma, geçersiz ara değer, null başlangıç)
değişmeden geçmeli.

### 3. `AdvancedSettingsSections.tsx` — `RiskCostFields` iç sırası değişir

Ara (bul ve değiştir, `AdvancedSettingsSections.tsx:39-50`, yalnızca İKİ
`<div className={`${styles.drawerRow} ${styles.column}`}>` bloğunun SIRASI
değişiyor, içerikleri AYNEN kalıyor):

```tsx
  return (
    <>
      <div className={`${styles.drawerRow} ${styles.column}`}>
        <div className={styles.drawerRowLabel}>Müteahhit Kazancı</div>
        <div className={styles.luxGrid}>
          {profitLevels.map(opt => (
            <div key={opt.id} className={`${styles.luxBox} ${builderProfit === opt.value ? styles.luxBoxActive : ''}`} onClick={() => setBuilderProfit(opt.value)}>
              <span>{opt.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className={`${styles.drawerRow} ${styles.column}`}>
        <div className={styles.drawerRowLabel}>İksa Masrafı</div>
        <div className={styles.luxGrid}>
          {[
            { label: 'Yok', value: 'off' as const },
            { label: 'Yüzde', value: 'percentage' as const },
            { label: 'Elle', value: 'manual' as const },
          ].map(opt => (
            <div key={opt.label} className={`${styles.luxBox} ${iksaMode === opt.value ? styles.luxBoxActive : ''}`} onClick={() => setIksaMode(opt.value)}>
              <span>{opt.label}</span>
            </div>
          ))}
        </div>
        {iksaMode === 'percentage' && (
          <div className={`${styles.stepperInput} ${styles.stepperFixed}`}>
            <input type="number" value={iksaPercentage} min={0} max={100} onChange={(e) => setIksaPercentage(Number(e.target.value))} />
            <div className={styles.stepperRight}>
              <span className={styles.stepperUnitCenter}>%</span>
            </div>
          </div>
        )}
        {iksaMode === 'manual' && (
          <div className={`${styles.stepperInput} ${styles.stepperFixed}`}>
            <input type="number" value={iksaManualTL} min={0} onChange={(e) => setIksaManualTL(Number(e.target.value))} />
            <div className={styles.stepperRight}>
              <span className={styles.stepperUnitCenter}>TL</span>
            </div>
          </div>
        )}
      </div>
    </>
  );
```

Yeni (iki blok yer değiştirdi, içerik aynı):

```tsx
  return (
    <>
      <div className={`${styles.drawerRow} ${styles.column}`}>
        <div className={styles.drawerRowLabel}>İksa Masrafı</div>
        <div className={styles.luxGrid}>
          {[
            { label: 'Yok', value: 'off' as const },
            { label: 'Yüzde', value: 'percentage' as const },
            { label: 'Elle', value: 'manual' as const },
          ].map(opt => (
            <div key={opt.label} className={`${styles.luxBox} ${iksaMode === opt.value ? styles.luxBoxActive : ''}`} onClick={() => setIksaMode(opt.value)}>
              <span>{opt.label}</span>
            </div>
          ))}
        </div>
        {iksaMode === 'percentage' && (
          <div className={`${styles.stepperInput} ${styles.stepperFixed}`}>
            <input type="number" value={iksaPercentage} min={0} max={100} onChange={(e) => setIksaPercentage(Number(e.target.value))} />
            <div className={styles.stepperRight}>
              <span className={styles.stepperUnitCenter}>%</span>
            </div>
          </div>
        )}
        {iksaMode === 'manual' && (
          <div className={`${styles.stepperInput} ${styles.stepperFixed}`}>
            <input type="number" value={iksaManualTL} min={0} onChange={(e) => setIksaManualTL(Number(e.target.value))} />
            <div className={styles.stepperRight}>
              <span className={styles.stepperUnitCenter}>TL</span>
            </div>
          </div>
        )}
      </div>

      <div className={`${styles.drawerRow} ${styles.column}`}>
        <div className={styles.drawerRowLabel}>Müteahhit Kazancı</div>
        <div className={styles.luxGrid}>
          {profitLevels.map(opt => (
            <div key={opt.id} className={`${styles.luxBox} ${builderProfit === opt.value ? styles.luxBoxActive : ''}`} onClick={() => setBuilderProfit(opt.value)}>
              <span>{opt.label}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
```

**Blast radius (araştırmayla doğrulandı):** `RiskCostFields`'ın TEK çağrı yeri
`GelismisAyarlarSheet.tsx:106-116` (mobil). Masaüstü bu bileşeni HİÇ
kullanmıyor — aynı iki alanı `page.tsx:723-763`'te bağımsız kendi JSX'iyle
tekrar ediyor. Bu değişiklik masaüstünü etkilemiyor.

### 4. Yeni dosya: `src/app/hesapla/SmartContextCardSections.tsx`

`SmartContextCard.tsx`'in üç bloğu (header/risk/area) buraya taşınır, HİÇBİR
JSX/mantık değişmeden — yalnızca üç ayrı named export'a bölünür:

```tsx
"use client";

import type { ParcelPickerValue } from '@/components/listing-wizard/ParcelPicker';
import { Toggle } from '@/components/ui/Toggle';
import type { RiskLevel } from './riskSuggestionHelpers';
import { riskKaynakEtiketi, type RiskKaynagi } from './mobile/riskSource';
import styles from './SmartContextCard.module.css';

export type LocationHeaderProps = {
    parcelContext: ParcelPickerValue | null;
    onOpenMap: () => void;
};

export function LocationHeader({ parcelContext, onOpenMap }: LocationHeaderProps) {
    const address = parcelContext?.parcel?.mahalle
        ? `${parcelContext.parcel.ilce}, ${parcelContext.parcel.mahalle}`
        : parcelContext
            ? 'Haritadan seçilen nokta'
            : null;

    return (
        <div className={styles.header} data-girdi-blok="konum">
            {address ? (
                <div className={styles.address}>📍 {address}</div>
            ) : (
                <button type="button" className={styles.unselectedBtn} onClick={onOpenMap}>
                    📍 Haritadan parsel seç
                </button>
            )}
            {address && (
                <button type="button" className={styles.editBtn} onClick={onOpenMap}>
                    Değiştir
                </button>
            )}
        </div>
    );
}

export type RiskSectionProps = {
    riskLevel: number;
    riskLevels: RiskLevel[];
    onRiskLevel: (v: number) => void;
    riskKaynagi: RiskKaynagi;
};

/**
 * Risk yuzdesinin maliyete etkisi. Motor risk payini (`isRiskEnabled`/`R`)
 * ve iksa masrafini (`isExcavationEnabled`/`Z`/`MzOriginal`) BAGIMSIZ girdiler
 * olarak isler; iksanin kendi ayri kontrolu var. Bu yuzden metin "iksa
 * maliyeti" degil "risk payi" der.
 */
function riskNotu(level: number): string {
    if (level >= 15) return '+%15 risk payı maliyete eklendi';
    if (level >= 10) return '+%10 risk payı maliyete eklendi';
    if (level >= 5) return '+%5 risk payı maliyete eklendi';
    return 'Ek risk payı yok';
}

export function RiskSection({ riskLevel, riskLevels, onRiskLevel, riskKaynagi }: RiskSectionProps) {
    return (
        <div className={styles.riskSection} data-girdi-blok="deprem-riski">
            <div className={styles.riskHeader}>
                <span>Deprem Riski</span>
                <span className={styles.riskKaynakEtiket}>{riskKaynakEtiketi(riskKaynagi)}</span>
            </div>
            <div className={styles.riskPills}>
                {riskLevels.map(opt => (
                    <button
                        key={opt.id}
                        type="button"
                        aria-pressed={riskLevel === opt.value}
                        className={`${styles.riskPill} ${riskLevel === opt.value ? styles.riskPillActive : ''}`}
                        onClick={() => onRiskLevel(opt.value)}
                    >
                        {opt.label}
                    </button>
                ))}
            </div>
            <p className={styles.riskNote}>{riskNotu(riskLevel)}</p>
        </div>
    );
}

export type AreaSectionProps = {
    parcelContext: ParcelPickerValue | null;
    arsaAlani: number;
    onArsaAlani: (v: number) => void;
    isAaEnabled: boolean;
    onIsAaEnabled: (v: boolean) => void;
};

export function AreaSection({ parcelContext, arsaAlani, onArsaAlani, isAaEnabled, onIsAaEnabled }: AreaSectionProps) {
    const isAreaVerified = parcelContext?.status === 'verified' && !!parcelContext.parcel?.areaSqm;

    return (
        <div className={styles.areaSection} data-girdi-blok="arsa-alani">
            <div className={styles.areaHeader}>
                <span>Arsa Alanı</span>
                <Toggle
                    className={styles.aaToggle}
                    checked={isAaEnabled}
                    aria-label="Arsa alanını hesaba kat"
                    onChange={(e) => onIsAaEnabled(e.target.checked)}
                />
            </div>
            {isAaEnabled && (
                <p className={`${styles.areaStatus} ${isAreaVerified ? styles.areaStatusOk : ''}`}>
                    {isAreaVerified ? '✓ TKGM Onaylı' : 'Elle girilmesi gerekiyor'}
                </p>
            )}
            {isAaEnabled && (
                <div className={styles.areaInputRow}>
                    <input
                        type="number"
                        value={arsaAlani || ''}
                        onChange={(e) => onArsaAlani(Number(e.target.value))}
                        placeholder="Alanı girin"
                    />
                    <span>m²</span>
                </div>
            )}
        </div>
    );
}
```

`styles.container` YALNIZCA `SmartContextCard.tsx`'in kendisinde kalıyor
(aşağıya bakın) — bu üç alt-bölüm kendi `.header`/`.riskSection`/`.areaSection`
kurallarını kullanıyor, `SmartContextCard.module.css`'e HİÇ dokunulmuyor.

### 5. `SmartContextCard.tsx` — ince sarmalayıcıya döner

Dosyanın TAMAMI şu hâle gelir (masaüstü çıktısı BİREBİR aynı kalır):

```tsx
import type { ParcelPickerValue } from '@/components/listing-wizard/ParcelPicker';
import type { RiskLevel } from './riskSuggestionHelpers';
import type { RiskKaynagi } from './mobile/riskSource';
import { LocationHeader, RiskSection, AreaSection } from './SmartContextCardSections';
import styles from './SmartContextCard.module.css';

export type SmartContextCardProps = {
    parcelContext: ParcelPickerValue | null;
    onOpenMap: () => void;
    arsaAlani: number;
    onArsaAlani: (v: number) => void;
    riskLevel: number;
    riskLevels: RiskLevel[];
    onRiskLevel: (v: number) => void;
    riskKaynagi: RiskKaynagi;
    isAaEnabled: boolean;
    onIsAaEnabled: (v: boolean) => void;
};

/**
 * Masaustu (ve "orijinal sira" gereken her yer) icin konum+risk+alan ucunu
 * TEK bir kart olarak birlestiren ince sarmalayici. Mobil ekran (GirdiKarti)
 * artik bu ucunu AYRI AYRI, kendi sirasinda kullaniyor — bkz.
 * SmartContextCardSections.tsx. Bu dosyanin cikardigi HTML masaustu icin
 * BIREBIR ONCEKI GIBI kalir.
 */
export function SmartContextCard({
    parcelContext, onOpenMap, arsaAlani, onArsaAlani,
    riskLevel, riskLevels, onRiskLevel, riskKaynagi,
    isAaEnabled, onIsAaEnabled,
}: SmartContextCardProps) {
    return (
        <div className={styles.container}>
            <LocationHeader parcelContext={parcelContext} onOpenMap={onOpenMap} />
            <RiskSection riskLevel={riskLevel} riskLevels={riskLevels} onRiskLevel={onRiskLevel} riskKaynagi={riskKaynagi} />
            <AreaSection parcelContext={parcelContext} arsaAlani={arsaAlani} onArsaAlani={onArsaAlani} isAaEnabled={isAaEnabled} onIsAaEnabled={onIsAaEnabled} />
        </div>
    );
}
```

**`SmartContextCard.test.tsx` DEĞİŞMİYOR** — bu dosya `<SmartContextCard>`'ın
PUBLIC arayüzünü test ediyor (`getByText`/`getByRole`), iç yapısına bakmıyor;
çıktı birebir aynı olduğu için mevcut 10 test değişmeden geçmeli.

### 6. `GirdiKarti.tsx` — yeni sıra + yeni Birim Maliyet alanı

**6a. Import'lar ve prop tipi.** Ara:

```tsx
import { computeEffectiveLandShareX, ORNEK_APARTMENT_SIZE } from '../calculatorUiHelpers';
import { SmartContextCard } from '../SmartContextCard';
import type { ParcelPickerValue } from '@/components/listing-wizard/ParcelPicker';
import type { RiskLevel } from '../riskSuggestionHelpers';
import type { RiskKaynagi } from './riskSource';
import styles from './mobile.module.css';

export type GirdiKartiProps = {
    parcelContext: ParcelPickerValue | null;
    arsaAlani: number;
    onArsaAlani: (v: number) => void;
    riskLevel: number;
    riskLevels: RiskLevel[];
    onRiskLevel: (v: number) => void;
    riskKaynagi: RiskKaynagi;
    isAaEnabled: boolean;
    onIsAaEnabled: (v: boolean) => void;
    /** Parsel doğrulama modalını açar */
    onParselDogrulaAc: () => void;
    luxLevel: number;
    onLuxLevel: (v: number) => void;
    apartmentSize: number | null;
    onApartmentSize: (v: number | null) => void;
    landShareRatio: number;
    onLandShareRatio: (v: number) => void;
    isApartmentCountEnabled: boolean;
    onApartmentCountEnabled: (v: boolean) => void;
    totalApartments: number;
    onTotalApartments: (v: number) => void;
    ownerApartmentShare: number;
    onOwnerApartmentShare: (v: number) => void;
};
```

Yeni:

```tsx
import { computeEffectiveLandShareX, ORNEK_APARTMENT_SIZE } from '../calculatorUiHelpers';
import { LocationHeader, RiskSection, AreaSection } from '../SmartContextCardSections';
import { useBufferedNumberInput } from '../useBufferedNumberInput';
import { kaynakEtiketi, type BirimMaliyetKaynagi } from './unitPriceSource';
import type { ParcelPickerValue } from '@/components/listing-wizard/ParcelPicker';
import type { RiskLevel } from '../riskSuggestionHelpers';
import type { RiskKaynagi } from './riskSource';
import styles from './mobile.module.css';

export type GirdiKartiProps = {
    parcelContext: ParcelPickerValue | null;
    arsaAlani: number;
    onArsaAlani: (v: number) => void;
    riskLevel: number;
    riskLevels: RiskLevel[];
    onRiskLevel: (v: number) => void;
    riskKaynagi: RiskKaynagi;
    isAaEnabled: boolean;
    onIsAaEnabled: (v: boolean) => void;
    /** Parsel doğrulama modalını açar */
    onParselDogrulaAc: () => void;
    luxLevel: number;
    onLuxLevel: (v: number) => void;
    apartmentSize: number | null;
    onApartmentSize: (v: number | null) => void;
    globalUnitPrice: number | null;
    birimMaliyetKaynagi: BirimMaliyetKaynagi;
    onBirimMaliyet: (v: number) => void;
    landShareRatio: number;
    onLandShareRatio: (v: number) => void;
    isApartmentCountEnabled: boolean;
    onApartmentCountEnabled: (v: boolean) => void;
    totalApartments: number;
    onTotalApartments: (v: number) => void;
    ownerApartmentShare: number;
    onOwnerApartmentShare: (v: number) => void;
};
```

**6b. Fonksiyon gövdesi — yeni prop'ları al, hook'u çağır.** Ara:

```tsx
export function GirdiKarti({
    parcelContext,
    arsaAlani,
    onArsaAlani,
    riskLevel,
    riskLevels,
    onRiskLevel,
    riskKaynagi,
    isAaEnabled,
    onIsAaEnabled,
    luxLevel,
    onLuxLevel,
    apartmentSize,
    onApartmentSize,
    landShareRatio,
    onLandShareRatio,
    isApartmentCountEnabled,
    onApartmentCountEnabled,
    totalApartments,
    onTotalApartments,
    ownerApartmentShare,
    onOwnerApartmentShare,
    onParselDogrulaAc,
}: GirdiKartiProps) {
    // Sd acikken gosterilen yuzde TURETILMISTIR, ayri bir state degildir.
    // Formul KOPYALANMAZ: motora giden deger de ayni yardimcidan gelir
    // (page.tsx), satir ici bir kopya zamanla ayrisirdi (A1 minor).
    const turetilmisYuzde = Math.round(computeEffectiveLandShareX({
        isApartmentCountEnabled: true,
        ownerApartmentShare,
        totalApartments,
        landShareRatio,
    }) * 100);
```

Yeni:

```tsx
export function GirdiKarti({
    parcelContext,
    arsaAlani,
    onArsaAlani,
    riskLevel,
    riskLevels,
    onRiskLevel,
    riskKaynagi,
    isAaEnabled,
    onIsAaEnabled,
    luxLevel,
    onLuxLevel,
    apartmentSize,
    onApartmentSize,
    globalUnitPrice,
    birimMaliyetKaynagi,
    onBirimMaliyet,
    landShareRatio,
    onLandShareRatio,
    isApartmentCountEnabled,
    onApartmentCountEnabled,
    totalApartments,
    onTotalApartments,
    ownerApartmentShare,
    onOwnerApartmentShare,
    onParselDogrulaAc,
}: GirdiKartiProps) {
    // Sd acikken gosterilen yuzde TURETILMISTIR, ayri bir state degildir.
    // Formul KOPYALANMAZ: motora giden deger de ayni yardimcidan gelir
    // (page.tsx), satir ici bir kopya zamanla ayrisirdi (A1 minor).
    const turetilmisYuzde = Math.round(computeEffectiveLandShareX({
        isApartmentCountEnabled: true,
        ownerApartmentShare,
        totalApartments,
        landShareRatio,
    }) * 100);

    const { girdi: birimMaliyetGirdi, handleChange: handleBirimMaliyetChange } =
        useBufferedNumberInput(globalUnitPrice, onBirimMaliyet);
```

**6c. JSX — yeni sıra.** Ara (bul ve TAMAMINI değiştir, `<SmartContextCard>`
çağrısından `</section>`'a kadar olan HER ŞEY):

```tsx
    return (
        <section className={styles.girdiKarti} aria-label="Proje girdileri">
            <SmartContextCard
                parcelContext={parcelContext}
                onOpenMap={onParselDogrulaAc}
                arsaAlani={arsaAlani}
                onArsaAlani={onArsaAlani}
                riskLevel={riskLevel}
                riskLevels={riskLevels}
                onRiskLevel={onRiskLevel}
                riskKaynagi={riskKaynagi}
                isAaEnabled={isAaEnabled}
                onIsAaEnabled={onIsAaEnabled}
            />

            <div className={styles.girdiSatir}>
                <span className={styles.girdiEtiket}>Yapı standardı</span>
                <div className={styles.segmentKap} role="tablist" aria-label="Yapı standardı">
                    {YAPI_STANDARTLARI.map(({ etiket, deger }) => {
                        const secili = luxLevel === deger;
                        return (
                            <button
                                key={etiket}
                                type="button"
                                role="tab"
                                aria-selected={secili}
                                className={`${styles.segment} ${secili ? styles.segmentAktif : ''}`}
                                onClick={() => onLuxLevel(deger)}
                            >
                                <svg width="21" height="21" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                    <path d={GLIF[etiket]} />
                                </svg>
                                {etiket}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ── Daire buyuklugu ── */}
            <div className={styles.girdiSatir}>
                <span className={styles.girdiEtiket}>Daire büyüklüğü</span>
                <div className={styles.stepperSatir}>
                    <input
                        type="number"
                        inputMode="numeric"
                        className={`${styles.stepperInput} mNum`}
                        value={apartmentSize ?? ''}
                        placeholder="—"
                        aria-label="Daire büyüklüğü, m²"
                        onChange={(e) => onApartmentSize(e.target.value === '' ? null : Number(e.target.value))}
                    />
                    <span className={styles.stepperBirim}>m²</span>
                    <button
                        type="button"
                        className={styles.stepperAzalt}
                        aria-label="Metrekareyi azalt"
                        onClick={() => {
                            if (apartmentSize === null) return;
                            const yeni = apartmentSize - M2_ADIM;
                            if (yeni >= M2_MIN) onApartmentSize(yeni);
                        }}
                    >
                        −
                    </button>
                    <button
                        type="button"
                        className={styles.stepperArtir}
                        aria-label="Metrekareyi artır"
                        onClick={() => {
                            if (apartmentSize === null) { onApartmentSize(ORNEK_APARTMENT_SIZE); return; }
                            const yeni = apartmentSize + M2_ADIM;
                            if (yeni <= M2_MAX) onApartmentSize(yeni);
                        }}
                    >
                        +
                    </button>
                </div>
            </div>

            {/* ── Arsa payi modu ── */}
            <div className={styles.girdiSatir}>
                <div className={styles.modSatir}>
                    <span className={styles.modEtiket}>
                        Daire sayısıyla gir{' '}
                        <span className={styles.modIpucu}>
                            ({totalApartments}&rsquo;de {ownerApartmentShare})
                        </span>
                    </span>
                    <button
                        type="button"
                        role="switch"
                        aria-checked={isApartmentCountEnabled}
                        aria-label="Toplam daire sayısı üzerinden hesapla"
                        className={`${styles.anahtar} ${isApartmentCountEnabled ? styles.anahtarAcik : ''}`}
                        onClick={() => onApartmentCountEnabled(!isApartmentCountEnabled)}
                    >
                        <span className={styles.anahtarTopu} />
                    </button>
                </div>

                {isApartmentCountEnabled ? (
                    <>
                        <div className={styles.sliderBasligi}>
                            <span className={styles.girdiEtiket}>Toplam daire</span>
                            <span className={`${styles.sliderDeger} mNum`}>{totalApartments}</span>
                        </div>
                        <input
                            type="range"
                            className={styles.slider}
                            min={1}
                            max={80}
                            step={1}
                            value={totalApartments}
                            style={ilerleme(totalApartments, 1, 80)}
                            aria-label="Toplam daire sayısı"
                            onChange={e => onTotalApartments(Number(e.target.value))}
                        />

                        <div className={styles.sliderBasligi}>
                            <span className={styles.girdiEtiket}>Arsa sahibinin daire sayısı</span>
                            <span className={`${styles.sliderDeger} mNum`}>{ownerApartmentShare}</span>
                        </div>
                        <input
                            type="range"
                            className={styles.slider}
                            min={0}
                            max={totalApartments}
                            step={1}
                            value={ownerApartmentShare}
                            style={ilerleme(ownerApartmentShare, 0, totalApartments)}
                            aria-label="Arsa sahibinin daire sayısı"
                            onChange={e => onOwnerApartmentShare(Number(e.target.value))}
                        />

                        {/* Salt-okunur: bu mod acikken yuzde TURETILIR, girilmez. */}
                        <p className={styles.turetilmisNot}>
                            Arsa payı <span className={`${styles.turetilmisYuzde} mNum`}>%{turetilmisYuzde}</span>
                            {' '}olarak hesaplanıyor.
                        </p>
                    </>
                ) : (
                    <>
                        <div className={styles.sliderBasligi}>
                            <span className={styles.girdiEtiket}>Arsa payı</span>
                            <span className={`${styles.sliderDeger} mNum`}>%{landShareRatio}</span>
                        </div>
                        <input
                            type="range"
                            className={styles.slider}
                            min={0}
                            max={100}
                            step={1}
                            value={landShareRatio}
                            style={ilerleme(landShareRatio, 0, 100)}
                            aria-label="Arsa payı yüzdesi"
                            onChange={e => onLandShareRatio(Number(e.target.value))}
                        />
                    </>
                )}
            </div>
        </section>
    );
}
```

Yeni:

```tsx
    return (
        <section className={styles.girdiKarti} aria-label="Proje girdileri">
            <LocationHeader parcelContext={parcelContext} onOpenMap={onParselDogrulaAc} />

            <AreaSection
                parcelContext={parcelContext}
                arsaAlani={arsaAlani}
                onArsaAlani={onArsaAlani}
                isAaEnabled={isAaEnabled}
                onIsAaEnabled={onIsAaEnabled}
            />

            <div className={styles.girdiSatir} data-girdi-blok="yapi-standardi">
                <span className={styles.girdiEtiket}>Yapı standardı</span>
                <div className={styles.segmentKap} role="tablist" aria-label="Yapı standardı">
                    {YAPI_STANDARTLARI.map(({ etiket, deger }) => {
                        const secili = luxLevel === deger;
                        return (
                            <button
                                key={etiket}
                                type="button"
                                role="tab"
                                aria-selected={secili}
                                className={`${styles.segment} ${secili ? styles.segmentAktif : ''}`}
                                onClick={() => onLuxLevel(deger)}
                            >
                                <svg width="21" height="21" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                    <path d={GLIF[etiket]} />
                                </svg>
                                {etiket}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ── Daire buyuklugu ── */}
            <div className={styles.girdiSatir} data-girdi-blok="daire-buyuklugu">
                <span className={styles.girdiEtiket}>Daire büyüklüğü</span>
                <div className={styles.stepperSatir}>
                    <input
                        type="number"
                        inputMode="numeric"
                        className={`${styles.stepperInput} mNum`}
                        value={apartmentSize ?? ''}
                        placeholder="—"
                        aria-label="Daire büyüklüğü, m²"
                        onChange={(e) => onApartmentSize(e.target.value === '' ? null : Number(e.target.value))}
                    />
                    <span className={styles.stepperBirim}>m²</span>
                    <button
                        type="button"
                        className={styles.stepperAzalt}
                        aria-label="Metrekareyi azalt"
                        onClick={() => {
                            if (apartmentSize === null) return;
                            const yeni = apartmentSize - M2_ADIM;
                            if (yeni >= M2_MIN) onApartmentSize(yeni);
                        }}
                    >
                        −
                    </button>
                    <button
                        type="button"
                        className={styles.stepperArtir}
                        aria-label="Metrekareyi artır"
                        onClick={() => {
                            if (apartmentSize === null) { onApartmentSize(ORNEK_APARTMENT_SIZE); return; }
                            const yeni = apartmentSize + M2_ADIM;
                            if (yeni <= M2_MAX) onApartmentSize(yeni);
                        }}
                    >
                        +
                    </button>
                </div>
            </div>

            {/* ── Birim insaat maliyeti — YENI, ana karta tasindi ── */}
            <div className={styles.girdiSatir} data-girdi-blok="birim-maliyet">
                <span className={styles.girdiEtiket}>
                    Birim inşaat maliyeti
                    <span className={styles.girdiEtiketKaynak}>{kaynakEtiketi(birimMaliyetKaynagi, globalUnitPrice)}</span>
                </span>
                <div className={styles.birimMaliyetSatir}>
                    <input
                        type="number"
                        inputMode="decimal"
                        className={`${styles.birimMaliyetInput} mNum`}
                        value={birimMaliyetGirdi}
                        placeholder="—"
                        aria-label="Birim inşaat maliyeti, TL/m²"
                        onChange={(e) => handleBirimMaliyetChange(e.target.value)}
                    />
                    <span className={styles.birimMaliyetBirim}>TL/m²</span>
                </div>
            </div>

            {/* ── Arsa payi modu ── */}
            <div className={styles.girdiSatir} data-girdi-blok="arsa-payi">
                <div className={styles.modSatir}>
                    <span className={styles.modEtiket}>
                        Daire sayısıyla gir{' '}
                        <span className={styles.modIpucu}>
                            ({totalApartments}&rsquo;de {ownerApartmentShare})
                        </span>
                    </span>
                    <button
                        type="button"
                        role="switch"
                        aria-checked={isApartmentCountEnabled}
                        aria-label="Toplam daire sayısı üzerinden hesapla"
                        className={`${styles.anahtar} ${isApartmentCountEnabled ? styles.anahtarAcik : ''}`}
                        onClick={() => onApartmentCountEnabled(!isApartmentCountEnabled)}
                    >
                        <span className={styles.anahtarTopu} />
                    </button>
                </div>

                {isApartmentCountEnabled ? (
                    <>
                        <div className={styles.sliderBasligi}>
                            <span className={styles.girdiEtiket}>Toplam daire</span>
                            <span className={`${styles.sliderDeger} mNum`}>{totalApartments}</span>
                        </div>
                        <input
                            type="range"
                            className={styles.slider}
                            min={1}
                            max={80}
                            step={1}
                            value={totalApartments}
                            style={ilerleme(totalApartments, 1, 80)}
                            aria-label="Toplam daire sayısı"
                            onChange={e => onTotalApartments(Number(e.target.value))}
                        />

                        <div className={styles.sliderBasligi}>
                            <span className={styles.girdiEtiket}>Arsa sahibinin daire sayısı</span>
                            <span className={`${styles.sliderDeger} mNum`}>{ownerApartmentShare}</span>
                        </div>
                        <input
                            type="range"
                            className={styles.slider}
                            min={0}
                            max={totalApartments}
                            step={1}
                            value={ownerApartmentShare}
                            style={ilerleme(ownerApartmentShare, 0, totalApartments)}
                            aria-label="Arsa sahibinin daire sayısı"
                            onChange={e => onOwnerApartmentShare(Number(e.target.value))}
                        />

                        {/* Salt-okunur: bu mod acikken yuzde TURETILIR, girilmez. */}
                        <p className={styles.turetilmisNot}>
                            Arsa payı <span className={`${styles.turetilmisYuzde} mNum`}>%{turetilmisYuzde}</span>
                            {' '}olarak hesaplanıyor.
                        </p>
                    </>
                ) : (
                    <>
                        <div className={styles.sliderBasligi}>
                            <span className={styles.girdiEtiket}>Arsa payı</span>
                            <span className={`${styles.sliderDeger} mNum`}>%{landShareRatio}</span>
                        </div>
                        <input
                            type="range"
                            className={styles.slider}
                            min={0}
                            max={100}
                            step={1}
                            value={landShareRatio}
                            style={ilerleme(landShareRatio, 0, 100)}
                            aria-label="Arsa payı yüzdesi"
                            onChange={e => onLandShareRatio(Number(e.target.value))}
                        />
                    </>
                )}
            </div>

            <RiskSection
                riskLevel={riskLevel}
                riskLevels={riskLevels}
                onRiskLevel={onRiskLevel}
                riskKaynagi={riskKaynagi}
            />
        </section>
    );
}
```

### 7. `mobile.module.css` — yeni Birim Maliyet stilleri

`.stepperBirim` bloğundan hemen sonra (mevcut tek büyük `@media (max-width:768px)`
bloğunun İÇİNDE) eklenir:

```css
    /* ── Birim insaat maliyeti ── */
    .girdiEtiketKaynak {
        margin-left: 6px;
        font-weight: 600;
        text-transform: none;
        letter-spacing: normal;
        color: var(--m-body);
        opacity: .8;
    }

    .birimMaliyetSatir {
        display: flex;
        align-items: center;
        height: 44px;
        padding: 3px 13px;
        border-radius: 16px;
        background: rgba(11, 32, 54, .055);
        border: 1px solid rgba(11, 32, 54, .07);
    }

    .birimMaliyetInput {
        flex: 1;
        min-width: 0;
        font-size: 16px;
        font-weight: 800;
        color: var(--m-ink);
        background: transparent;
        border: none;
        outline: none;
    }
    .birimMaliyetInput::-webkit-outer-spin-button,
    .birimMaliyetInput::-webkit-inner-spin-button {
        -webkit-appearance: none;
        margin: 0;
    }

    .birimMaliyetBirim {
        flex: none;
        font-size: 12px;
        font-weight: 700;
        color: var(--m-body);
    }
```

### 8. `GelismisAyarlarSheet.tsx` — Birim Maliyet çıkar, aria-label yenilenir

Ara (bul ve değiştir):

```tsx
import {
    MarketField,
    RiskCostFields,
    BirimMaliyetField,
    type MarketFieldProps,
    type RiskCostProps,
    type BirimMaliyetFieldProps,
} from '../AdvancedSettingsSections';
```

Yeni:

```tsx
import {
    MarketField,
    RiskCostFields,
    type MarketFieldProps,
    type RiskCostProps,
} from '../AdvancedSettingsSections';
```

Ara:

```tsx
export type GelismisAyarlarSheetProps =
    & RiskCostProps
    & MarketFieldProps
    & BirimMaliyetFieldProps
    & {
```

Yeni:

```tsx
export type GelismisAyarlarSheetProps =
    & RiskCostProps
    & MarketFieldProps
    & {
```

Ara:

```tsx
                <section
                    ref={piyasaRef}
                    className={styles.ayarBolum}
                    role="group"
                    aria-label="Piyasa fiyatı"
                    data-acilis={bolum('piyasa')}
                >
                    <BirimMaliyetField
                        globalUnitPrice={alanlar.globalUnitPrice}
                        birimMaliyetKaynagi={alanlar.birimMaliyetKaynagi}
                        onBirimMaliyet={alanlar.onBirimMaliyet}
                    />
                    <MarketField
                        manualMarketPrice={alanlar.manualMarketPrice}
                        setManualMarketPrice={alanlar.setManualMarketPrice}
                    />
                </section>
```

Yeni:

```tsx
                <section
                    ref={piyasaRef}
                    className={styles.ayarBolum}
                    role="group"
                    aria-label="Piyasa karşılaştırması"
                    data-acilis={bolum('piyasa')}
                >
                    <MarketField
                        manualMarketPrice={alanlar.manualMarketPrice}
                        setManualMarketPrice={alanlar.setManualMarketPrice}
                    />
                </section>
```

(`...alanlar` spread'i `GelismisAyarlarSheet`'in destructure ettiği `open,
onClose, onUygula, onSifirla, acilisBolumu` DIŞINDAKİ her şeyi kapsıyor —
`GelismisAyarlarSheetProps`'tan `BirimMaliyetFieldProps` çıkınca `alanlar`
artık `globalUnitPrice`/`birimMaliyetKaynagi`/`onBirimMaliyet` İÇERMEYECEK,
ekstra bir kod değişikliği gerekmiyor.)

### 9. `page.tsx` — prop akışı

**9a. `girdi={{...}}` nesnesine üç alan eklenir** (`page.tsx:549-565`). Ara:

```tsx
          girdi={{
            parcelContext,
            arsaAlani, onArsaAlani: setArsaAlani,
            isAaEnabled,
            onIsAaEnabled: setIsAaEnabled,
            riskLevel,
            riskLevels,
            onRiskLevel: handleRiskLevel,
            riskKaynagi,
            onParselDogrulaAc: () => setIsParcelModalOpen(true),
            luxLevel, onLuxLevel: setLuxLevel,
            apartmentSize, onApartmentSize: handleApartmentSizeChange,
            landShareRatio, onLandShareRatio: setLandShareRatio,
            isApartmentCountEnabled, onApartmentCountEnabled: setIsApartmentCountEnabled,
            totalApartments, onTotalApartments: setTotalApartments,
            ownerApartmentShare, onOwnerApartmentShare: setOwnerApartmentShare,
          }}
```

Yeni:

```tsx
          girdi={{
            parcelContext,
            arsaAlani, onArsaAlani: setArsaAlani,
            isAaEnabled,
            onIsAaEnabled: setIsAaEnabled,
            riskLevel,
            riskLevels,
            onRiskLevel: handleRiskLevel,
            riskKaynagi,
            onParselDogrulaAc: () => setIsParcelModalOpen(true),
            luxLevel, onLuxLevel: setLuxLevel,
            apartmentSize, onApartmentSize: handleApartmentSizeChange,
            globalUnitPrice, birimMaliyetKaynagi, onBirimMaliyet: handleGlobalUnitPriceChange,
            landShareRatio, onLandShareRatio: setLandShareRatio,
            isApartmentCountEnabled, onApartmentCountEnabled: setIsApartmentCountEnabled,
            totalApartments, onTotalApartments: setTotalApartments,
            ownerApartmentShare, onOwnerApartmentShare: setOwnerApartmentShare,
          }}
```

**9b. `<GelismisAyarlarSheet>` çağrısından üç prop kalkar** (`page.tsx:605-607`).
Ara:

```tsx
          acilisBolumu={mobilAyarBolumu}
          globalUnitPrice={globalUnitPrice}
          birimMaliyetKaynagi={birimMaliyetKaynagi}
          onBirimMaliyet={handleGlobalUnitPriceChange}
          iksaMode={iksaMode} setIksaMode={setIksaMode}
```

Yeni:

```tsx
          acilisBolumu={mobilAyarBolumu}
          iksaMode={iksaMode} setIksaMode={setIksaMode}
```

**Masaüstü etkilenmiyor:** `globalUnitPrice`/`birimMaliyetKaynagi`/
`handleGlobalUnitPriceChange` desktop'ta zaten `<BirimMaliyetField>`'a
(`page.tsx:715` civarı) ayrıca geçiliyor — bu çağrı satırına DOKUNULMUYOR.

## Test güncellemeleri

- **Yeni:** `src/app/hesapla/useBufferedNumberInput.test.ts` — hook'un
  davranışını doğrudan test eder (başlangıç değeri, boş bırakma, geçersiz ara
  değer commit edilmez, dış kaynaklı prop değişikliği state'i senkronlar).
  `AdvancedSettingsSections.test.tsx`'teki mevcut 5 `BirimMaliyetField` testi
  DEĞİŞMEDEN geçmeli (hook'un davranışı birebir aynı).
- **Yeni:** `src/app/hesapla/SmartContextCardSections.test.tsx` — üç alt-bölüm
  için ayrı testler (mevcut `SmartContextCard.test.tsx`'in 10 testinin ilgili
  kısımlarının aynısı, artık her bölüm kendi başına render edilerek).
  `SmartContextCard.test.tsx`'in KENDİSİ değişmez.
- `GirdiKarti.test.tsx`: yeni prop'lar (`globalUnitPrice`, `birimMaliyetKaynagi`,
  `onBirimMaliyet`) test yardımcı `props()` fonksiyonuna eklenir. Yeni testler:
  (1) Birim Maliyet alanı doğru değeri/kaynak etiketini gösterir, (2) elle
  yazılan değer `onBirimMaliyet`'e iletilir, (3) bir DOM-sıra testi: yedi
  bloğun (`LocationHeader`/`AreaSection`/Yapı Standardı/Daire Büyüklüğü/Birim
  Maliyet/Arsa Payı/`RiskSection`) her biri kendi `data-girdi-blok="..."`
  attribute'unu taşıyor (bkz. Değişiklikler §4/§6c) — test
  `container.querySelectorAll('[data-girdi-blok]')` ile hepsini toplayıp
  `.map(el => el.getAttribute('data-girdi-blok'))`'in TAM OLARAK
  `['konum', 'arsa-alani', 'yapi-standardi', 'daire-buyuklugu',
  'birim-maliyet', 'arsa-payi', 'deprem-riski']` sırasına eşit olduğunu
  doğrular. Bu proje için yeni bir test deseni ama artık somut, kırılgan
  olmayan bir mekanizmaya dayanıyor (metin içeriğine değil, açık bir
  test-hook'una).
- `AdvancedSettingsSections.test.tsx`: mevcut 5 `BirimMaliyetField` testi
  değişmeden geçmeli (regresyon guard'ı). `RiskCostFields` için yeni bir test:
  İksa Masrafı'nın DOM'da Müteahhit Kazancı'ndan ÖNCE geldiğini doğrular.
- `GelismisAyarlarSheet.test.tsx`: `props()` yardımcısından
  `globalUnitPrice`/`birimMaliyetKaynagi`/`onBirimMaliyet` kaldırılır (artık
  prop tipinde yok). "Piyasa fiyatı" `aria-label` assertion'ları (satır
  41, 56, 62) "Piyasa karşılaştırması"na güncellenir. Yeni test: "Birim
  inşaat maliyeti" metninin yaprakta ARTIK OLMADIĞINI doğrular (mevcut "arsa
  alanı yapraktan kalktı" testleriyle aynı desen).
- **Kritik regresyon guard'ı:** `page.test.tsx` (varsa) veya yeni bir test —
  masaüstü `<SmartContextCard>` çağrısının (`page.tsx:696`) HİÇ değişmediğini,
  masaüstü JSX ağacının `<BirimMaliyetField>` çağrısının
  (`page.tsx:712-720`) da değişmediğini doğrular.

## Doğrulama planı

- `tsc --noEmit` → 0 hata.
- `npx jest --no-coverage --roots "src"` → tüm suite yeşil.
- Canlı/dev sunucuda gerçek Playwright doğrulaması (390×844, gerçek mobil UA):
  - Ana kartın yeni sırasının (Konum→Arsa Alanı→Yapı Standardı→Daire
    Büyüklüğü→Birim İnşaat Maliyeti→Arsa Payı→Deprem Riski) göründüğü.
  - Birim İnşaat Maliyeti alanının Liquid Glass stilinde (masaüstü
    `page.module.css` değil) render olduğu, `getComputedStyle` ile
    doğrulanır.
  - Gelişmiş Ayarlar yaprağının artık Birim Maliyet İÇERMEDİĞİ, İksa
    Masrafı'nın Müteahhit Kazancı'ndan ÖNCE göründüğü.
  - **Masaüstü genişlikte** `SmartContextCard`'ın (konum→risk→alan sırası),
    desktop sidebar'daki `BirimMaliyetField`'ın ve "Piyasa Analizi"/"Maliyet
    ve Riskler" bölümlerinin BİREBİR ÖNCEKİ GİBİ kaldığı — bu spec'in en
    kritik regresyon riski.
  - Elle bir Birim Maliyet değeri girilip "Min. Daire Fiyatı" sonucunun
    doğru güncellendiği (motor değişmedi ama uçtan uca doğrulama önemli).
