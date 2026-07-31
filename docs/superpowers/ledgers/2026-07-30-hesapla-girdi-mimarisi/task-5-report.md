# Task 5 Raporu: Yapraktan formül parametrelerini çıkar

## Özet

`FormulParamsFields` ikiye bölündü: `DaireSayisiFields` (Toplam Daire Sayısı +
Arsa Sahibine Düşen Daire) ve `ArsaAlaniFields` (Arsa Alanı m²).
`FormulParamsFields` bir sarmalayıcı olarak korundu ve ikisini aynı sırada
(önce `DaireSayisiFields`, sonra `ArsaAlaniFields`) render ediyor — masaüstü
çağrıları hiç değişmedi. Mobil yaprak (`GelismisAyarlarSheet`) artık yalnızca
`ArsaAlaniFields` render ediyor; bölüm `aria-label`ı "Formül parametreleri"den
"Arsa alanı"na değişti. `page.tsx`'teki `<GelismisAyarlarSheet .../>` çağrısı
altı adet daire-sayısı prop'undan arındırıldı.

## Yapılan Değişiklikler

### `src/app/hesapla/AdvancedSettingsSections.tsx`
- Yeni export: `DaireSayisiProps` / `DaireSayisiFields` — eski
  `FormulParamsFields` gövdesinin ilk `<div className={drawerRow column}>`
  bloğu (Toplam Daire Sayısı + Arsa Sahibine Düşen Daire) buraya taşındı,
  hiçbir JSX/mantık değişmedi.
- Yeni export: `ArsaAlaniProps` / `ArsaAlaniFields` — ikinci blok (Arsa Alanı
  m²) buraya taşındı, aynen.
- `FormulParamsProps` artık `DaireSayisiProps` ve `ArsaAlaniProps`'u
  `extends` ediyor (aynı 10 alan, tekrar yazılmadı).
- `FormulParamsFields` artık brief'teki gövdeyle birebir: `DaireSayisiFields`
  sonra `ArsaAlaniFields`, props'lar tek tek thread edilerek.

### `src/app/hesapla/mobile/GelismisAyarlarSheet.tsx`
- Import: `FormulParamsFields, type FormulParamsProps` → `ArsaAlaniFields,
  type ArsaAlaniProps`.
- `GelismisAyarlarSheetProps` intersection'ında `FormulParamsProps` yerine
  `ArsaAlaniProps` (altı daire-sayısı alanı tipten düştü).
- "Formül parametreleri" bölümünün `aria-label`ı `"Arsa alanı"` oldu; içeriği
  artık yalnızca `ArsaAlaniFields` (isAaEnabled/setIsAaEnabled/arsaAlani/
  setArsaAlani).
- Dosya başındaki JSDoc yorumu güncellendi: `FormulParamsFields` referansı
  `ArsaAlaniFields` ile değiştirildi, A1 I4 kararını açıklayan yeni bir not
  eklendi (masaüstü cekmecenin `FormulParamsFields`'i değişmeden kullanmaya
  devam ettiği açıkça belirtildi).

### `src/app/hesapla/mobile/GelismisAyarlarSheet.test.tsx`
- `props()` fikstüründen altı alan çıkarıldı: `isApartmentCountEnabled`,
  `setIsApartmentCountEnabled`, `totalApartments`, `setTotalApartments`,
  `ownerApartmentShare`, `setOwnerApartmentShare`. (`isAaEnabled`/
  `setIsAaEnabled`/`arsaAlani`/`setArsaAlani` kaldı.)
- `role="group"` adı assertion'ı `'Formül parametreleri'` → `'Arsa alanı'`
  olarak güncellendi (satır 60'taki "dört bölüm" testi).
- Yorum satırındaki `FormulParamsFields` referansı `ArsaAlaniFields` ile
  değiştirildi (satır 66 civarı, kod değil ama yanlış bilgi verirdi).
- Brief'in iki yeni testi eklendi (aşağıda TDD kanıtı).

### `src/app/hesapla/page.tsx`
- `<GelismisAyarlarSheet .../>` çağrısından (satır ~590-593) şu altı satır
  silindi: `isApartmentCountEnabled`, `setIsApartmentCountEnabled`,
  `totalApartments`/`setTotalApartments`, `ownerApartmentShare`/
  `setOwnerApartmentShare`. `isAaEnabled`/`setIsAaEnabled`/`arsaAlani`/
  `setArsaAlani` çağrıda kaldı (yaprak hâlâ arsa alanını gösteriyor).
- Masaüstü `FormulParamsFields` çağrılarına (satır ~821 mobil-accordion
  içinde ve ~893 drawer içinde — brief'in "725" referansı muhtemelen daha
  eski bir dosya sürümüne aitti, güncel satır numaraları farklı) **hiç
  dokunulmadı**. `git diff src/app/hesapla/page.tsx` bunu doğruluyor: tek
  hunk, `GelismisAyarlarSheet` çağrısındaki dört satırlık silme.

## Brief'teki İki Metin İddiasının Doğrulanması

Brief'in yeni testleri şu iki string'i varsayıyordu:
- `'Toplam Daire Sayısı'` (yok olmalı) — `AdvancedSettingsSections.tsx`'te
  gerçek metin: `Toplam Daire Sayısı` (satır 42). **Birebir eşleşti**,
  değişiklik gerekmedi.
- `/Arsa Alanı/` (var olmalı) — gerçek metin: `Arsa Alanı (m²)` (satır 87).
  Regex `/Arsa Alanı/` anchor'sız olduğu için alt string olarak eşleşiyor,
  **test brief'te yazıldığı gibi çalıştı**, değişiklik gerekmedi.

Her iki test brief'teki haliyle hiçbir düzeltme gerektirmeden geçti.

## TDD Kanıtı

**RED** — `npx jest src/app/hesapla/mobile/GelismisAyarlarSheet --no-coverage`
(testler eklendikten, implementasyondan ÖNCE):
```
× daire sayisi kontrolleri yaprakta ARTIK YOK (girdi kartina ait) (26 ms)
  ● GelismisAyarlarSheet › daire sayisi kontrolleri yaprakta ARTIK YOK (girdi kartina ait)
    expect(received).toBeNull()
    Received: <div class="drawerRowLabel drawerRowLabelNowrap">Toplam Daire Sayısı</div>
Tests: 1 failed, 12 passed, 13 total
```
Beklenen sebep tam olarak buydu: yaprak henüz `FormulParamsFields`
kullanıyordu, "Toplam Daire Sayısı" hâlâ render ediliyordu. ("arsa alani
yaprakta KALIR" testi zaten o an da geçiyordu — beklenen, çünkü o davranış
zaten mevcuttu, sadece regresyona karşı sabitleniyordu.)

**GREEN** — aynı komut, implementasyondan SONRA:
```
Test Suites: 1 passed, 1 total
Tests:       13 passed, 13 total
```

## Tam Doğrulama

```
npx jest --no-coverage
→ Test Suites: 96 passed, 96 total
  Tests:       691 passed, 691 total   (baseline 689 + 2 yeni test)

npx tsc --noEmit
→ (çıktı yok, 0 hata)
```

Baseline (değişiklik öncesi, aynı ortamda ölçüldü): jest 689/689, tsc 0.
Fark: +2 test (bu task'ın yeni testleri), tsc hâlâ 0.

## Masaüstü Parite Doğrulaması

1. `git diff src/app/hesapla/page.tsx` yalnızca `GelismisAyarlarSheet`
   çağrısında dört satırlık silme gösteriyor; dosyadaki iki
   `FormulParamsFields` çağrısı (mobil-accordion ~821, drawer ~893) diff'te
   hiç görünmüyor → byte-identical.
2. `FormulParamsFields`'in yeni gövdesi `DaireSayisiFields` sonra
   `ArsaAlaniFields` render ediyor — eski gövdenin JSX sırasıyla birebir
   aynı (ilk blok Toplam Daire Sayısı, ikinci blok Arsa Alanı idi).
   Fonksiyon bileşenleri ekstra DOM node eklemediği için render edilen DOM
   ağacı öncekiyle aynı.
3. `FormulParamsProps` tipi `DaireSayisiProps & ArsaAlaniProps` (extends ile)
   — aynı 10 alan, aynı adlar, aynı tipler; masaüstü çağrı yerlerinin prop
   listesi hiç değişmedi (tsc 0 hata bunu doğruluyor — tip uyuşmazlığı
   olsaydı yakalardı).

## Öz-İnceleme Sonuçları

- **Masaüstü parite:** Doğrulandı (yukarıda). Değişiklik yok, sıra aynı.
- **Bütünlük:** Altı alan sheet'in tipinden (`ArsaAlaniProps` kullanımı),
  JSX'inden, test fikstüründen ve `page.tsx` çağrısından kaldırıldı —
  grep ile doğrulandı (`GelismisAyarlarSheet.tsx` içinde bu altı adın hiçbiri
  kalmadı).
- **Yaprak içeriği:** Yaprak hâlâ arsa alanını (`ArsaAlaniFields`) render
  ediyor, daire-sayısı kontrolleri artık render edilmiyor (yeni testlerle
  doğrulandı).
- **Test kalitesi:** Yeni testler implementasyondan önce beklenen sebeple
  kırmızı, sonra yeşildi (yukarıdaki RED/GREEN kanıtı). Çıktı temiz, ekstra
  console uyarısı yok.
- Ek olarak: dosya içindeki iki yorum satırı (`GelismisAyarlarSheet.tsx`
  JSDoc'u ve test dosyasındaki inline yorum) `FormulParamsFields`
  referansını `ArsaAlaniFields` olarak güncellemek için düzeltildi — brief
  bunu açıkça istemedi ama yanlış bilgi taşıyordu, kod yorumu olduğu için
  düzeltildi.

## Endişeler

- Brief "masaüstü page.tsx:725" diyordu; güncel dosyada iki
  `FormulParamsFields` çağrısı var (satır ~821 ve ~893), 725 civarında değil.
  Muhtemelen brief yazıldığından beri dosyaya başka task'larla satır
  eklendi. İçerik olarak brief'in istediği "masaüstü çağrısına dokunma"
  kuralına uyuldu (her iki çağrıya da dokunulmadı) — sadece satır numarası
  referansı bayattı, davranışsal bir sorun değil.
- Diğer bir konu yok; her iki self-review maddesi de temiz çıktı.

## Değiştirilen Dosyalar

- `C:/Users/emre/Desktop/arsabil-main/.claude/worktrees/mobil-liquid-glass/src/app/hesapla/AdvancedSettingsSections.tsx`
- `C:/Users/emre/Desktop/arsabil-main/.claude/worktrees/mobil-liquid-glass/src/app/hesapla/mobile/GelismisAyarlarSheet.tsx`
- `C:/Users/emre/Desktop/arsabil-main/.claude/worktrees/mobil-liquid-glass/src/app/hesapla/mobile/GelismisAyarlarSheet.test.tsx`
- `C:/Users/emre/Desktop/arsabil-main/.claude/worktrees/mobil-liquid-glass/src/app/hesapla/page.tsx`

Commit: `fd72559` — "refactor(hesapla): formul parametreleri yapraktan cikti, arsa alani kaldi"

---

## Fix Round 1/5 (koordinatör review'ı sonrası)

### Review'da bildirilen iki Important bulgu

**Bulgu 1 — `AdvancedSettingsSections.tsx`'teki `FormulParamsFields`
sarmalayıcısında koruma yorumu yoktu.** Eski (bölünmeden önceki) JSDoc
korunmuştu; sarmalayıcının VAR OLMA SEBEBİNİ (mobil yaprağın yalnızca arsa
alanı yarısını kullanabilmesi) ve masaüstü paritesinin `DaireSayisiFields`
sonra `ArsaAlaniFields` SIRASINA bağlı olduğunu hiçbir şey söylemiyordu.

**Bulgu 2 — `page.tsx`'teki `onSifirla`, artık yaprakta olmayan üç alanı hâlâ
sıfırlıyordu.** Task 5 `isApartmentCountEnabled` / `totalApartments` /
`ownerApartmentShare` kontrollerini yapraktan çıkarıp yalnızca girdi kartına
taşıdı, ama `onSifirla` hâlâ `setIsApartmentCountEnabled`,
`setTotalApartments`, `setOwnerApartmentShare`'i çağırıyordu. Bu, "Ayarları
sıfırla" butonunun — yaprakta hiç görünmeyen — girdi kartını sessizce yeniden
yazması demekti: A1 I4'ün render yolunda kapattığı kusurun reset yolundaki
aynısı.

### Yapılan Düzeltmeler

**1. `AdvancedSettingsSections.tsx` — `FormulParamsFields` JSDoc'u
değiştirildi:**
```tsx
/**
 * Drawer "Formül Parametreleri" kartının içeriği (kart sarmalayıcısı hariç).
 *
 * SADELESTIRMEYIN. Bu sarmalayici, mobil yaprak yalnizca arsa alani kismini
 * kullanabilsin diye bilesen ikiye ayrildiginda korundu (A1 I4). Masaustu
 * cekmecesi bunu cagirmaya devam ediyor ve ciktisinin bugunkuyle AYNI kalmasi
 * bir kisittir: `DaireSayisiFields` sonra `ArsaAlaniFields`, bu SIRAYLA.
 * Inline etmek ya da sirayi degistirmek masaustu duzenini sessizce bozar ve
 * bunu yakalayan bir test YOK.
 */
```

**2. `page.tsx` — `onSifirla`'dan üç satır silindi**
(`setIsApartmentCountEnabled`, `setTotalApartments`,
`setOwnerApartmentShare`); yorum, sıfırlamanın kapsamının artık "yaprağın
gösterdiği" olduğunu ve daire-sayısı/arsa-payının bilerek dışarıda
bırakıldığını açıklayacak şekilde güncellendi. `AYAR_VARSAYILANLARI` sabiti
**hiç değiştirilmedi** — 11 alanın tamamı hâlâ orada, çünkü `useState`
başlangıç değerleri hepsini kullanmaya devam ediyor. Sabitin üstündeki genel
yorum da (satır ~43-49) artık "Sıfırla yalnızca 8 alanı okur" gerçeğini
yansıtacak şekilde güncellendi.

**3. `pageStyles.scope.test.ts` — tek döngülü test iki listeye bölündü:**
- `gelişmiş ayar varsayılanları TEK kaynakta (Sıfırla ile ayrışamaz)` testi
  artık iki ayrı döngü çalıştırıyor: `tumAlanlar` (11 alan) yalnızca
  `useState<...>(AYAR_VARSAYILANLARI.x)` desenini doğruluyor;
  `sifirlananAlanlar` (8 alan — yaprağın gösterdikleri) yalnızca
  `set...(AYAR_VARSAYILANLARI.x)` desenini doğruluyor. Türkçe yorum, yaprağa
  yeni bir alan eklenirse bu listenin de güncellenmesi gerektiğini
  açıklıyor.
- Yeni test eklendi: `daire-sayisi/arsa-payi Sıfırla eyleminde ARTIK
  okunmuyor (Task 5, A1 I4)` — `isApartmentCountEnabled`, `totalApartments`,
  `ownerApartmentShare`'in `set...(AYAR_VARSAYILANLARI.x)` deseniyle HİÇ
  eşleşmediğini doğruluyor (negatif assertion).

### Kapsayan Testler ve Çıktı

```
npx jest src/app/hesapla/pageStyles.scope.test.ts --no-coverage
→ Test Suites: 1 passed, 1 total
  Tests:       30 passed, 30 total
  (ilgili iki test: "gelişmiş ayar varsayılanları TEK kaynakta..." ve
   "daire-sayisi/arsa-payi Sıfırla eyleminde ARTIK okunmuyor..." — ikisi de PASS)

npx jest --no-coverage
→ Test Suites: 96 passed, 96 total
  Tests:       692 passed, 692 total   (bir önceki round'dan +1: yeni negatif test)

npx tsc --noEmit
→ (çıktı yok, 0 hata)
```

Ayrıca `grep -n "setIsApartmentCountEnabled(AYAR_VARSAYILANLARI\|setTotalApartments(AYAR_VARSAYILANLARI\|setOwnerApartmentShare(AYAR_VARSAYILANLARI" src/app/hesapla/page.tsx`
ile bu üç çağrının dosyada başka hiçbir yerde kalmadığı doğrulandı (boş
sonuç).

### Verifikasyon Metodu Üzerine Not (koordinatörün geri bildirimine yanıt)

Önceki raporda masaüstü paritesini ispatlarken `git diff`'in çağrı yerini
değiştirmediğini ÖNCE söylemiştim — bu yalnızca çağrı *metninin* değişmediğini
kanıtlar, sarmalayıcının *içinin* aynı çıktıyı ürettiğini kanıtlamaz (asıl
değişen zaten sarmalayıcının içiydi). Asıl ispat, sarmalayıcının
`DaireSayisiFields`'i sonra `ArsaAlaniFields`'i AYNI SIRAYLA render etmesi ve
her ikisinin de öncekiyle birebir aynı JSX alt ağacını döndürmesiydi (fonksiyon
bileşenleri ekstra DOM node eklemez). Bu round'da bunu tersine çevirdim:
ağırlığı taşıyan argümanı (sıra + aynı alt ağaç) öne aldım, `git diff`
bulgusunu yalnızca destekleyici/ikincil kanıt olarak bıraktım.

### Ertelenen Bulgu (reviewer'ın Minor'ı)

Reviewer'ın "masaüstü drawer render'ını koruyan otomatik bir test yok" Minor
bulgusu bu round'da **düzeltilmedi** — koordinatör bunu Task 10'un masaüstü
regresyon geçişine erteledi (burada bir snapshot testi kırılgan olurdu).
Ledger'a ertelenmiş olarak not düşüldü.

### Değiştirilen Dosyalar (bu round)

- `C:/Users/emre/Desktop/arsabil-main/.claude/worktrees/mobil-liquid-glass/src/app/hesapla/AdvancedSettingsSections.tsx`
- `C:/Users/emre/Desktop/arsabil-main/.claude/worktrees/mobil-liquid-glass/src/app/hesapla/page.tsx`
- `C:/Users/emre/Desktop/arsabil-main/.claude/worktrees/mobil-liquid-glass/src/app/hesapla/pageStyles.scope.test.ts`

Commit: `d75703b` — "fix(hesapla): sifirla artik girdi kartina ait alanlari yazmiyor, wrapper korunma yorumu eklendi"
