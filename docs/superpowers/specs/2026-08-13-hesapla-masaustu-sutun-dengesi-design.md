# Hesapla Masaüstü — Sütun Dengesizliği (Sol Sidebar / Boş Sağ)

**Tarih:** 2026-08-13
**Durum:** Onaylandı (mockup üzerinden), plan aşamasına geçiliyor.

## Bağlam

Kullanıcı bulgusu: masaüstü `/hesapla`'da sol sütun ("Proje Bilgileri") aşağıya
kadar uzun taşıyor, sağ tarafta neredeyse hiçbir şey yok, orta alan az sayıda
alanla duruyor. Playwright ile 1440×900'de ölçüldü ve doğrulandı: sol sütun
(`aside.leftSidebar`) 1296px yüksekliğinde, orta+sağ sütunların gerçek içeriği
(`#resultsPanel` + özet paneli) yalnızca 678px'te bitiyor — ~618px boşluk kalıyor.

Bu, önceki bir spec'in (`2026-08-13-hesapla-girdi-karti-sira-design.md`) kapsam
dışı bıraktığı, bilinen bir bulgu: "kullanıcı açıkça 'önce mobil' dedi — bu
tamamen ayrı bir spec/plan gerektirecek." Mobil taraf artık bitti (o spec +
bugünkü simetri düzeltmesi), sıra masaüstünde.

**Kök neden:** Bugün aynı oturumda mobilde tamamlanan "ana kart / Gelişmiş
Ayarlar" ayrımı (`GirdiKarti` vs `GelismisAyarlarSheet`) masaüstüne hiç
uygulanmamış — masaüstü hâlâ TÜM alanları (temel + gelişmiş) tek uzun
`aside.leftSidebar` içinde art arda gösteriyor (`page.tsx:623-764`, 7 ayar
grubu). Ayrıca `.rightGrid`'in kendi CSS'i (`page.module.css:816-819`) zaten
`grid-template-rows: max-content 1fr` — yani 2. bir satır TANIMLI ama hiç
kullanılmıyor (`mainPanel` ve `summaryPanel` ikisi de 1. satırda yan yana).

Ek bulgu: masaüstünün Müteahhit Kazancı + İksa Masrafı alanları
(`page.tsx:721-761`) `AdvancedSettingsSections.tsx`'teki paylaşılan
`RiskCostFields` bileşeniyle (mobilin Gelişmiş Ayarlar yaprağının kullandığı)
**birebir aynı JSX'i elle kopyalamış** — aynı `styles.luxGrid`/`styles.luxBox`
class'ları. Bu spec bu tekrarı da temizler.

Mockup (onaylandı, 2 revizyon sonrası — ilk revizyon navbar ortalama +
tema-sızıntılı kontrast düzeltti, ikinci revizyon "Apple design" yönünde sakin/
restraint bir tona geçti): https://claude.ai/code/artifact/67416f11-d0a6-4076-b330-b52d654226ea

## Kapsam

Yalnızca `/hesapla` **masaüstü** düzeni (`isDesktopViewport === true` dalı,
`page.tsx:619-764` + `:767-945`). Mobil (`GirdiKarti`/`HesaplaMobile`) bu
turda hiç değişmiyor. Motor/hesaplama mantığı, state, davranış değişmiyor —
yalnızca hangi JSX'in nerede render edildiği ve `RiskCostFields`'e geçiş.

### 1. Sol sütun ("Proje Bilgileri") — yalnızca ana kart alanları kalır

Kalanlar (sıra değişmiyor):
1. Daire Standardı (`page.tsx:629-643`)
2. Ortalama Daire Metrekaresi (`:645-659`)
3. Toplam Daire Sayısı (`:661-687`)
4. `SmartContextCard` — Konum + Deprem Riski + Arsa Alanı (`:693-706`)
5. Birim İnşaat Maliyeti — yalnızca `BirimMaliyetField`, "Piyasa Analizi"
   dış başlığı (`:709` `<h4>Piyasa Analizi</h4>`) kaldırılır çünkü
   `BirimMaliyetField` zaten kendi içinde "Birim inşaat maliyeti" etiketini
   render ediyor (`AdvancedSettingsSections.tsx:117`) — çift başlık olurdu.
   Mobil ana kartın aynı alanda ayrı bir grup başlığı göstermemesiyle tutarlı.

Kaldırılanlar (aşağıdaki yeni panele taşınır):
- `MarketField` çağrısı (`:715-718`)
- Müteahhit Kazancı inline JSX'i (`:721-730`)
- İksa Masrafı inline JSX'i (`:732-761`)

### 2. Yeni panel: "Gelişmiş Ayarlar" — `rightGrid`'in boş 2. satırını doldurur

`page.module.css:816-819`:
```css
.rightGrid {
    display: grid;
    grid-template-columns: minmax(0, 1.15fr) minmax(0, .85fr);
    grid-template-rows: max-content 1fr;   /* → max-content max-content */
}
```
`1fr` → `max-content` değişir: yeni panel kendi içeriği kadar yer kaplar,
yapay olarak gerilip içi boş bir kart görünmez (bkz. "Açık risk" bölümü).

Yeni class `.advancedPanel { grid-column: 1 / -1; }` — `rightGrid`'in
DOĞRUDAN 3. çocuğu olarak eklenir (mainPanel/summaryPanel'den SONRA, aynı
`<section className={styles.rightGrid}>` içinde), otomatik grid yerleşimi
onu 2. satıra, tam genişliğe yerleştirir.

İçerik — 3 yan yana sütun (`.advancedPanel` içinde `grid-template-columns:
repeat(3, minmax(0,1fr))`):
```tsx
<div className={styles.advancedPanel}>
  <h3 className={styles.advancedPanelTitle}>Gelişmiş Ayarlar</h3>
  <div className={styles.advancedPanelCols}>
    <MarketField manualMarketPrice={manualMarketPrice} setManualMarketPrice={setManualMarketPrice} />
    <RiskCostFields
      iksaMode={iksaMode} setIksaMode={setIksaMode}
      iksaPercentage={iksaPercentage} setIksaPercentage={setIksaPercentage}
      iksaManualTL={iksaManualTL} setIksaManualTL={setIksaManualTL}
      builderProfit={builderProfit} setBuilderProfit={setBuilderProfit}
      profitLevels={profitLevels}
    />
  </div>
</div>
```
`RiskCostFields` bir `<>...</>` Fragment döner (İksa Masrafı + Müteahhit
Kazancı, iki `drawerRow.column` div'i) — `MarketField`'in tek div'iyle
birlikte toplam 3 direkt çocuk, `repeat(3,1fr)` grid'e otomatik yerleşir.
`RiskCostFields`'in kendi içeriğine DOKUNULMUYOR, yalnızca çağrıldığı yer
değişiyor (`page.tsx` artık kendi kopyasını değil bu bileşeni kullanıyor).

`import`: `page.tsx`'e `RiskCostFields` eklenir (`MarketField`/
`BirimMaliyetField` zaten import edili).

### 3. Görsel dil — mockup'tan alınan kararlar

- Panel `mainPanel`/`summaryPanel` ile AYNI kart dilini kullanır (`--border`,
  `--radius`, `--card-bg`) — yeni bir renk/çerçeve dili İCAT EDİLMEZ.
- Başlık ("Gelişmiş Ayarlar") sade, `.sidebarTitle`/`.mainPanelTitle` ile
  aynı tipografik ağırlıkta; rozet/badge YOK, kalın renkli çerçeve YOK.
- 3 sütun arası `MarketField`/İksa/Müteahhit — her biri kendi
  `drawerRowLabel`'ıyla zaten etiketli, panel düzeyinde ek bir alt-başlık
  gerekmiyor.

## Açık risk — dürüstçe belirtilmiş (kullanıcı onayladı)

Sol sütun ~1296px'ten muhtemelen ~950-1050px'e iner (3 grup çıkınca), yeni
panel sağ tarafa content-height kadar (~250-350px, kesin değil) ekler. Tam
pixel-eşitlik GARANTİ EDİLMİYOR — amaç "gözle büyük boşluk kalmasın", pixel-
perfect değil. Plan/implementasyon aşamasında gerçek yükseklikler Playwright
ile ölçülüp raporlanacak. Eğer `max-content` sonrası hâlâ belirgin bir boşluk
kalırsa, bu spec'in dışında ayrı bir takip kararı gerekir (ör. panel içini
zenginleştirmek) — bu turda ZORLANMAYACAK.

## Kapsam dışı (bu turda YAPILMIYOR)

- Mobil `/hesapla` — hiç dokunulmuyor.
- `leftSidebar`'ın kendisinin iç düzeni (ör. 2 sütuna bölünmesi) — Yaklaşım B
  olarak değerlendirilip reddedildi (bkz. sohbet), bu spec Yaklaşım A'yı
  (içerik yeniden dağıtımı) uygular.
- `mainPanel`/`summaryPanel`'in kendi iç içeriği/sırası — değişmiyor.
- Deprem Riski + İksa Masrafı'nın aynı yüzeyde birleştirilmesi — önceki
  spec'te de kapsam dışı bırakılmıştı, burada da bırakılıyor (iki ayrı UI
  yüzeyinde kalmaya devam ediyorlar).
- Diğer masaüstü sayfaları (Pazar Yeri, Anasayfa) — kullanıcı kapsamı
  açıkça `/hesapla` ile sınırladı.

## Test Planı

- `AdvancedSettingsSections.test.tsx` — `RiskCostFields` zaten test edilmiş
  (mobil sheet üzerinden), yeni bir davranış eklenmiyor; yalnızca yeni bir
  render konumu.
- `page.test.tsx` — yeni assertion'lar: (1) masaüstünde `.advancedPanel`
  içinde İksa Masrafı/Müteahhit Kazancı/Piyasa Karşılaştırması render
  olduğu, (2) sol sidebar'da bu üç alanın ARTIK olmadığı (regresyon kilidi:
  `queryByText`/`queryByRole` ile "Piyasa Analizi" başlığının sol sütunda
  bulunmadığı), (3) state/handler'ların (`iksaMode`, `builderProfit`, vb.)
  konum değiştikten sonra hâlâ doğru çalıştığı (mevcut testlerin çoğu zaten
  bunu örtük olarak kapsıyor, konum bağımsız).
- `pageStyles.scope.test.ts` / `SmartContextCard.styles.scope.test.ts` gibi
  CSS-modül tarama testleri varsa yeni class'ların (`.advancedPanel`,
  `.advancedPanelTitle`, `.advancedPanelCols`) kullanılan/tanımlı olduğu
  otomatik doğrulanır.
- Playwright ile 1440×900 gerçek ölçüm: sol sütun / sağ taraf toplam
  yükseklik farkı implementasyon sonrası raporlanır (bkz. "Açık risk").
