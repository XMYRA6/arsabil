# Mobil Kart Dili Revizyonu - Faz 2 Implementasyon Plani

> **For agentic workers:** Faz 1 tamamlanmadan uygulanmaz. Bu faz, Faz 1'in bilerek kapsam disi biraktigi mobil ekranlari tamamlar; yeni bir tema veya tum site a11y refaktoru degildir.

**Goal:** Faz 1 sonrasi kalan mobil glass tekrarlarini, icerik rolune gore ayrisan `stat`, `row` ve `editorial listing` desenlerine tasimak; profil/ikincil sayfalar ve ilan ozeti yuzeylerinde aynilasma hissini azaltmak.

**Architecture:** Faz 1'de eklenen global yuzeyler korunur. Fotograf/ilan odakli yuzeyler icin ek bir `.mEditorialListingCard` global class seti tanimlanir; sayfa CSS module'lari `composes: ... from global` ile tuketir. React state veya backend contract degismez.

**Spec:** `docs/superpowers/specs/2026-08-15-mobil-kart-dili-revizyonu-design.md`

## Global Constraints

- Yalnizca mobil scope degisir; masaustu selector ve layout davranisi korunur.
- Pazar `ListingCard` Faz 1'de temizlenmis referans olarak kalir; bu faz onu yeniden tasarlamaz.
- Dark tema destegi mevcut mobil token stratejisiyle celismeyecek sekilde ele alinir; yeni desenlerde koyu tema varsa explicit testlenir, yoksa light-only oldugu dokumante edilir.
- Skeleton loader yayginlastirma, tam a11y taramasi ve site-geneli hata metni revizyonu kapsam disidir.
- Uc role de net oturmayan yuzeyler zorla donusturulmez; `keep/custom` gerekcesi kaydedilir.

### Task 1: Faz 1 sonrasi kalan glass envanteri

**Files:**
- Add: `docs/superpowers/plans/2026-08-15-mobil-kart-dili-revizyonu-faz2-audit.md`
- Inspect: `src/app/**/*.{css,tsx}`
- Inspect: `src/components/**/*.{css,tsx}`

- [x] `rg "m-glass-bg|m-glass-border|m-glass-blur|mGlass" src` ciktisini Faz 1 sonrasi kaydet.
- [x] Her kalan kullanim icin role ata: `stat`, `row`, `editorial`, `chrome`, `modal`, `keep/custom`, `out-of-scope`.
- [x] Profil alt ekranlari, ayarlar, bildirimler, ilan teklifleri, favoriler/ilanlarim ve ikincil auth akislari icin dosya bazli hedef desen belirle.
- [x] Pazar `ListingCard` ve button/badge accent kullanimlarini yanlis pozitif olarak ayir.

### Task 2: `.mEditorialListingCard` desen seti

**Files:**
- Modify: `src/app/globals.css`
- Modify/Add: `src/app/globalsMobile.scope.test.ts`

- [x] `.mEditorialListingCard`, `.mEditorialListingMedia`, `.mEditorialListingBody`, `.mEditorialListingTitle`, `.mEditorialListingMeta` global class'larini mobil scope'ta tanimla.
- [x] Foto yoksa light placeholder gradient ve dark icin aurora fallback davranisini explicit yap.
- [x] Baslik icin sinirli `--font-serif` token kullanimi ekle; genel UI fontunu degistirme.
- [x] `:focus-visible`, `:active`, reduced motion ve min tap hedefi testlerini ekle.
- [x] Desenin `backdrop-filter` veya kopya glass arka plani tasimadigini scope testleriyle kanitla.

### Task 3: Iklan/favori/teklif ozetleri editorial desene tasinir

**Files:**
- Inspect/Modify: ilgili dashboard favorites/listings CSS module dosyalari
- Inspect/Modify: ilgili offers/listing-summary CSS module dosyalari
- Modify/Add: ilgili `*.scope.test.ts`

- [x] Favoriler ve ilanlarim gibi fotograf/arsa bilgisi tasiyan mobil kartlari `.mEditorialListingCard` kompozisyonuna tasi.
- [x] Ilan teklifleri icindeki ilan ozeti, teklif aksiyon kartindan ayrilsin; teklif aksiyonu stat/action yuzeyi olarak kalsin.
- [x] Foto placeholder'i yalnizca gercek foto yoksa devreye girsin.
- [x] Baslik, adres, m2/oran/fiyat gibi veriler tabular ve taranabilir kalsin.

### Task 4: Profil, ayarlar ve bildirim satirlari row/stat desenlerine tasinir

**Files:**
- Inspect/Modify: `src/app/dashboard/profile/**/*`
- Inspect/Modify: `src/app/dashboard/settings/**/*`
- Inspect/Modify: `src/app/dashboard/notifications/**/*`
- Modify/Add: ilgili `*.scope.test.ts`

- [x] Kisi/danisman/ayar satirlari kart yerine `.mRowList` veya mevcut row desenine tasinsin.
- [x] Toplam, durum, kota, sayac ve ozet yuzeyleri `.mStatSurface` kullansin.
- [x] Kritik aksiyon veya destructive alanlar role gore ayrilsin; sirf glass tekrarini azaltmak icin anlam kaybi yaratma.
- [x] Kalan `window.alert()` veya jenerik hata metni varsa yalnizca dokunulan dosyalarda inline/role="alert" desenine cevir.

### Task 5: Auth ve ikincil mobil sayfa taramasi

**Files:**
- Inspect/Modify: `src/app/login/**/*`
- Inspect/Modify: `src/app/register/**/*`
- Inspect/Modify: diger mobile-only ikincil sayfa CSS module dosyalari
- Modify/Add: ilgili `*.scope.test.ts`

- [x] Form kabuklari ve bilgi notlarini `stat`/`row`/`chrome` olarak ayir.
- [x] Form input, modal, sheet ve navigation chrome gibi alanlarda glass kullanimi bilerek korunuyorsa `keep/custom` olarak audit'e yaz.
- [x] Focus-visible eksigi dokunulan form/action elemanlariyla sinirli giderilsin.
- [x] Mobil safe-area ve bottom-nav bosluklari degismeden kalsin.

### Task 6: Verification

- [x] Faz 2 audit dosyasi kalan tum `--m-glass-*` kullanimlari icin gerekce icerir.
- [x] Ilgili CSS scope ve component testlerini calistir.
- [x] `npx tsc --noEmit` calistir.
- [x] 390x844 mobil Playwright smoke turu yap: profil, ayarlar, bildirimler, favoriler/ilanlarim, ilan teklifleri, login/register.

## Exit Criteria

- Faz 1 disinda kalan mobil ekranlarda glass tekrarlarinin buyuk kismi role dayali desenlere tasinmistir.
- Fotograf/ilan ozeti yuzeyleri istatistik karti veya liste satiri gibi gorunmez.
- Kalan glass kullanimlari rastgele degil, audit dosyasinda bilerek korunmus `chrome/modal/custom` yuzeyleridir.


## Validation Notes

- `npx jest src/app/globalsMobile.scope.test.ts src/app/dashboard/favorites/page.test.tsx src/app/dashboard/listings/page.test.tsx src/app/dashboard/settings/page.test.tsx src/app/dashboard/profile/profileStyles.scope.test.ts src/app/dashboard/profile/edit/page.test.tsx src/app/notifications/page.test.tsx src/app/login/loginMobile.scope.test.ts src/app/register/registerMobile.scope.test.ts --no-coverage --roots "<rootDir>/src"` PASS: 9 suites / 109 tests.
- `npx jest --runTestsByPath "src/app/listing/[id]/offers/page.test.tsx" --no-coverage --roots "<rootDir>/src"` PASS: 1 suite / 4 tests.
- `npx tsc --noEmit` PASS.
- `npx jest --no-coverage --roots "<rootDir>/src"` PASS: 173 suites / 1358 tests.
- `npm run build` PASS. Notlar: Next workspace-root ve middleware/proxy uyarilari mevcut; build basarili.
- `node output/playwright/faz2-card-mobile-smoke.cjs` PASS: 390x844 rotalarinda yatay overflow yok. Protected dashboard/offer rotalari login callback'e yonlendi; `/notifications`, `/login`, `/register` render edildi.
