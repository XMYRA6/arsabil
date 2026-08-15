# Superpowers Execution Queue

Bu dosya plan arşivini uygulanabilir bir sıraya indirger. `README.md` hangi
spec'in hangi planla kapandığını gösterir; bu dosya ise **hangi işi önce
başlatmanın daha mantıklı olduğunu** söyler.

## Queue Principles

- Önce veri doğruluğu ve hesap motoru, sonra görsel/yerleşim işleri.
- Aynı yüzeye dokunan planlar çakışmayacak şekilde sıralanır.
- Obsolete/closure/orchestration dosyaları dispatch edilmez.
- Büyük görsel redesign planları, daha küçük ve kritik UX düzeltmeleri bittikten
  sonra ele alınır.
- Her item kendi canonical planındaki test/build kapılarıyla kapanır.

---

## Recommended Order

### 1. Emsal arsa maliyeti modeli

**Plan:** `2026-07-01-emsal-arsa-maliyeti.md`

**Neden önce:** Hesap motoru ve veri modeliyle ilgili temel bir ürün kabiliyetidir.
Sonraki UI iyileştirmeleri bu kavramı bilerek tasarlanırsa daha az geri dönüş
olur.

**Risk:** Orta-yüksek. Prisma migration + admin/API + engine + `/hesapla` UI zinciri.

**Definition of Done:**
- `avgLandPricePerM2` nullable alanı DB/API/admin boyunca çalışıyor.
- `engine_v2` proportional/comparable modelleri testli.
- `/hesapla` Emsal seçeneğini yalnızca veri varsa aktif ediyor.

---

### 2. Masaüstü `/hesapla` girdi sırası ve arsa payı tek blok

**Plan:** `2026-08-14-hesapla-masaustu-girdi-sirasi.md`

**Neden şimdi:** 2026-07-29/30 girdi mimarisi ve 2026-08-13 sütun dengesiyle aynı
yüzeye dokunuyor. Emsal modeli eklendikten sonra Arsa Payı bloğu zaten yeniden
düşünüleceği için bu iş onun hemen arkasından gelmeli.

**Risk:** Orta. `page.tsx` JSX sırası ve eski `SmartContextCard` temizliği.

**Definition of Done:**
- Sidebar sırası mobil zihinsel modelle aynı.
- Arsa Payı tek kontrol bloğu.
- `SmartContextCard` ölü sarmalayıcısı silindi.

---

### 3. Masaüstü `/hesapla` sütun dengesi

**Plan:** `2026-08-13-hesapla-masaustu-sutun-dengesi.md`

**Neden bu sırada:** Girdi sırası değiştikten sonra sağ/sol yükseklik dengesi daha
doğru ölçülür. Bu işi önce yapmak, sonra sidebar içeriğini tekrar taşımak demek.

**Risk:** Orta. Gelişmiş Ayarlar paneli yeni grid satırına taşınıyor.

**Definition of Done:**
- Sol sidebar gereksiz uzamıyor.
- Gelişmiş Ayarlar sağ grid altında tek panel.
- Desktop Playwright ölçümü raporlu.

---

### 4. Pazaryeri veri bütünlüğü

**Plan:** `2026-08-12-pazaryeri-veri-butunlugu.md`

**Neden şimdi:** Görsel redesign’dan önce kartların ve filtrelerin doğru veriyle
beslenmesi gerekir. UI polish, yanlış veya tutarsız veri üstünde yapılmamalı.

**Risk:** Orta. Listing display/filter helpers ve marketplace page davranışı.

**Definition of Done:**
- ListingCard mock fallback’leri kontrollü.
- Filtre/harita/liste verisi tutarlı.
- İlan kartları fotoğraf/score/metrikleri doğru kaynaktan okuyor.

---

### 5. PWA güncelleme bildirimi

**Plan:** `2026-08-13-pwa-guncelleme-bildirimi.md`

**Neden burada:** Kullanıcı güvenini artıran, ana ürün yüzeylerinden bağımsız bir
stabilite işi. Büyük UI redesign’dan önce yapılırsa sonraki build/deploy döngülerini
daha rahat test ettirir.

**Risk:** Düşük-orta. Service worker contract + update banner.

**Definition of Done:**
- Yeni sürüm algılanıyor.
- Kullanıcı kontrollü refresh.
- Chunk error reload davranışı testli.

---

### 6. Profesyonel UI redesign

**Plan:** `2026-06-08-arsabil-professional-ui-redesign.md`

**Neden daha sonra:** Çok geniş CSS yüzeyi var. Hesapla/pazar veri ve UX kararları
oturduktan sonra uygulanırsa görsel sistem daha az tekrar değişir.

**Risk:** Yüksek. Global token + çok sayıda CSS module.

**Definition of Done:**
- Token katmanı ve ana yüzeyler profesyonel gayrimenkul diline geçti.
- Desktop/mobile smoke görsel regresyonu yok.
- Yeni inline style eklenmedi.

---

### 7. Mobil Premium Liquid Glass sonraki fazları

**Plan:** `2026-07-28-mobil-premium-liquid-glass.md`

**Neden sonra:** Faz 0+1 Hesapla zaten detaylı planlanmış. Kalan pazar/auth/portföy
fazları için ayrı planlar yazılmalı; profesyonel UI token kararlarıyla çakışma
kontrolü gerekir.

**Risk:** Yüksek. Birçok route ve mobil görsel sistem.

**Definition of Done:**
- Kalan fazlar için yeni detay planları oluşturuldu.
- Her faz 390x844 Playwright turuyla kapanıyor.

---

## Do Not Dispatch Directly

Bu dosyalar orchestration/closure/pointer dosyalarıdır; doğrudan kod işi olarak
başlatılmamalı:

- `2026-06-07-arsabil-gelistirme-yol-haritasi.md`
- `2026-06-07-arsabil-faz2.md`
- `2026-06-07-arsabil-faz3b.md`
- `2026-06-07-mobile-ui-premium-redesign.md`
- `2026-06-08-arsabil-ui-design-system.md`
- `2026-07-03-mobile-ui-redesign.md`
- `2026-07-28-mobil-premium-liquid-glass.md`
- `2026-07-29-hesapla-girdi-mimarisi.md`

## Suggested First Dispatch

Start with:

```text
docs/superpowers/plans/2026-07-01-emsal-arsa-maliyeti.md
Task 1: Veri modeli, API ve admin ekranina avgLandPricePerM2 ekle
```

This creates the data foundation without forcing immediate broad UI redesign.
