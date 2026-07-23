# Ana Sayfa — Apple Liquid Glass Yeniden Tasarımı

## Bağlam

2026-07-22'de ana sayfaya bento grid + hero yeniden tasarımı yapılıp merge edildi (`57a933c`) — gerçek görsel arka planlar (bento: engine-v2/cost-analysis/marketplace/security-pdf, blog×3, steps×3, vision×2, cta-bg), mouse-tracking 3D tilt. Aynı oturumun devamında kullanıcı bunu yetersiz bulup daha köklü bir görsel kimlik istedi: **Apple Liquid Glass** (iOS 26-27 tarzı buzlu cam) + **Kadastro/blueprint** illüstrasyon dili. Brainstorming (`superpowers:brainstorming` + visual companion, `.superpowers/brainstorm/1818-1784718174/content/`) ile tasarım dili netleşti ama hiç koda uygulanmadı.

Bugünkü oturumda önce `ui-ux-pro-max` skill'i + Playwright ile canlı sitede **3 gerçek katman/glass hatası** bulunup düzeltildi (commit `2f12005`):
1. `.howItWorksGrid` mobil kırılım noktası eksikti (640px altında 3 sütun sabit kalıyordu).
2. Bento kartlarındaki telefon mockup'larında (`.mobileDeviceFrame` > `.glassEngineWidget`/`.glassDonutWidget`/`.glassProposalWidget`/`.glassPdfWidget`) üç katlı beyaz-üstüne-beyaz blur, arka plan fotoğraflarını düz opak beyaza yıkıyordu.
3. `.heroTeaserGlass`, `.hero` ile aynı `rgba(255,255,255,.65)` değerini paylaşıp üst üste binince düz beyaza yıkanıyordu — bu, `widget-glass-refine.html` mockup'ında zaten onaylanmış "B) mavi tonlu cam + kenar parıltısı" çözümünün canlı koda ilk kez uygulanmasıydı.

Bu spec, geri kalan (henüz koda hiç dokunulmamış) tasarım dili değişikliklerini kapsar: kicker/badge sadeleştirmesi, blueprint illüstrasyon aksanları, ve cam yoğunluğunun sistematik olarak tüm bölümlere yayılması.

## Kullanıcı Kararları

1. **Kapsam:** Tüm ana sayfa (hero, bento, stats, "Süreç Nasıl Çalışır", vision/mission, blog, faq, cta) — tek marka dili her yerde. Uygulama içi diğer sayfalarla (Mühür kimliği taşınmış sayfalar) tutarlılık aranmaz, ana sayfa kendi diline sahip.
2. **Referans:** Linear/Stripe minimalizmi + Apple Liquid Glass. Navbar/hero container'ın mevcut yapısı (pill-shaped navbar, rounded 32px hero card, contained max-width — full-bleed DEĞİL) korunur, sadece cam yoğunluğu/kalitesi artırılır.
3. **Renk:** Pirinç/Mühür Lacivert paleti KULLANILMAZ (2026-07-07'de zaten terk edildi). Marka vurgusu mevcut mavi ailesi: `--brand-gradient: linear-gradient(135deg, #1f6feb, #134ea5 60%, #2b7cff)` (globals.css:8-11), `--aurora-violet/blue/cyan`. Yeni global token gerekmez.
4. **İllüstrasyon:** Kadastro/blueprint çizim dili (ince mühendislik çizgileri, parsel/ada grid'i, mono rakamlar) — **fotoğrafların YERİNE geçmez**, geçen oturumda eklenen gerçek görseller (bento/blog/steps/vision/cta) korunur. Blueprint dili, kartların kenarına/arka planına/boş alanlarına **aksan** olarak eklenir (ör. `hero-bento-mockup-v2.html`'deki `.v2-card-visual` grid-çizgi deseni, `.v2-plot` parsel-çizim motifi — bu deseni fotoğrafın ÜZERİNE değil, fotoğrafın olmadığı kart yüzeylerine/boşluklara uygula).
5. **Kicker/eyebrow:** Elmas ikonlu pill badge (`heroBadge`, şu an "✨ Türkiye'nin İlk Dijital Arsa Fizibilite Platformu") kaldırılıp sade metin kicker'a geçilir (bkz. `v2-kicker` mockup deseni — arka plansız, sadece renkli küçük metin).
6. **Cam yoğunluğu:** Bugün düzeltilen 3 nested-glass deseni (opaklık düşür + mavi tint + kenar parıltısı, `box-shadow: 0 0 0 1px rgba(31,111,235,.08), ... inset 0 1px 0 rgba(255,255,255,.85-.9)`) referans desen olarak diğer cam yüzeylerde de (blog kartları, faq item'ları, cta kartı) tutarlı şekilde uygulanır.
7. Kalan bölümler için ayrı ayrı mockup gösterilmeyecek — dil netleşti, direkt gerçek kodda uygulanacak (kullanıcı: "artık dili biliyorsun, direkt uygula").

## Kapsam — Bölüm Bazlı Envanter

Aşağıdaki envanter `src/app/page.tsx` + `src/app/page.module.css`'in gerçek kod taramasına dayanır (satır numaraları uygulama planında teyit edilir).

### 1) Hero (`.hero`, satır 13-)
- `heroBadge` (satır 628, emoji+pill) → sade metin kicker'a çevrilir, `v2-kicker` stiline yakın (arka plansız, `color: var(--primary)`, `font-weight:600`, `letter-spacing`).
- `heroTeaserGlass` — **bugün düzeltildi**, dokunulmaz (referans desen olarak kullanılır).
- `heroTitle`/`heroSubtitle`/`heroCta` — tipografi/buton stili büyük ölçüde mevcut, sadece buton stilinin `v2-btn-primary`/`v2-btn-secondary` sadeliğine (gölge/radius kalibrasyonu) yaklaştırılması değerlendirilir.

### 2) Stats Strip (`.statsStrip`, satır 66)
- Sayılar zaten tabular görünüyor (12.400+, ~3sn, %97) — `font-variant-numeric: tabular-nums` + mono font uygulanıp uygulanmadığı teyit edilir, eksikse eklenir.

### 3) Bento Grid (`.bentoGrid`/`.bentoCard`, satır 129-452)
- **Bugün düzeltildi:** `.mobileDeviceFrame` nested-glass wash. Dokunulmaz.
- `.bentoCard` kenar/arka plan boşluklarına (fotoğrafın olmadığı `.bentoTextGroup` tarafı) blueprint grid-çizgi dokusu aksan olarak eklenir (`repeating-linear-gradient` deseni, `rgba(31,111,235,.05-.08)` çok düşük alfa — kararar #4).
- `.bentoTag` (ör. "ENGINE V2 ALGORİTMASI") — mono/tabular font'a geçirilir (blueprint "teknik döküman" hissi için).

### 4) "Süreç Nasıl Çalışır" (`.howItWorksGrid`, satır 446, 1254)
- **Bugün düzeltildi:** mobil kırılım noktası. Dokunulmaz.
- Kart görselleri (steps×3 fotoğraf) korunur, kart numaraları (01/02/03) mono/tabular font'a geçirilir.

### 5) Vision/Mission (`.visionMission`, satır 699-)
- Cam yüzey + mavi kenar parıltısı deseni uygulanır (bugünkü referans desen).

### 6) Blog (`.blogGrid`/`.blogCard`, satır 751-806)
- `.blogCategoryTag` (satır 760 vb.) zaten koyu opak rozet, bug değil ama tutarlılık için mavi-tint cam desenine çevrilebilir (düşük öncelik).
- Kart border/hover glow, mavi kenar parıltısı desenine hizalanır.

### 7) FAQ (`.faqList`, satır 588-)
- `.faqItem` açık/kapalı durumları cam yüzey deseniyle hizalanır (şu an düz `var(--panel)` kullanıyor olabilir, teyit edilir).

### 8) CTA (satır 806 sonrası)
- `cta-bg.png` görseli korunur, üzerindeki buton/kart camı bugünkü referans desene hizalanır.

## Kapsam Dışı

- Fotoğrafların blueprint illüstrasyonla değiştirilmesi — kesin olarak reddedildi (karar #4).
- Pirinç/Mühür Lacivert paleti — kesin olarak reddedildi (karar #3).
- Uygulama içi diğer sayfalar (hesapla/listing/marketplace/dashboard/admin) — bu spec sadece ana sayfa (`src/app/page.tsx`).
- Yeni global token/CSS değişkeni eklenmesi — mevcut `--brand-gradient`/`--aurora-*` yeniden kullanılır.
- AI görsel üretim prompt'larının yazılması — ayrı bir takip adımı (bkz. Sıradaki Adımlar), bu spec sadece kod tarafını kapsar.
- Dark tema "Pazar Yerine Git" butonu iddiası — 2026-07-22'de canlı sitede doğrulanamadı, bu spec kapsamına girmiyor.

## Teknik Yaklaşım

- Blueprint grid-çizgi deseni (aksan, fotoğrafsız boşluklarda):
  ```css
  background:
    repeating-linear-gradient(0deg, rgba(31, 111, 235, 0.06) 0 1px, transparent 1px 24px),
    repeating-linear-gradient(90deg, rgba(31, 111, 235, 0.06) 0 1px, transparent 1px 24px);
  ```
  (mockup'taki `.v2-card-visual` deseninin birebir mavi-aileye çevrilmiş hali — `hero-bento-mockup-v2.html:36-37`).
- Nested-glass referans deseni (bugün 3 yerde uygulandı, aynı desen diğer cam yüzeylerde tekrarlanır):
  ```css
  background: linear-gradient(165deg, rgba(219, 234, 254, 0.34), rgba(255, 255, 255, 0.24));
  border-color: rgba(31, 111, 235, 0.22);
  box-shadow:
    0 12px 32px rgba(31, 111, 235, 0.08),
    0 0 0 1px rgba(31, 111, 235, 0.16),
    inset 0 1px 0 rgba(255, 255, 255, 0.85);
  ```
  Her cam yüzeyde: **ebeveyninin opaklığını kontrol et** (iç içe blur varsa toplam opaklık hesapla, ~%80'i geçmesin), gerekiyorsa ebeveyn opaklığını düşür (bugünkü `.mobileDeviceFrame` 0.85→0.55 deseni).
- Kicker: `font-size:13px; font-weight:600; color:rgba(31,111,235,.85); letter-spacing:.01em` (arka plan/border yok — `heroBadge`'in class'ı kaldırılır, yerine yeni `.kicker` class'ı gelir; `sectionEyebrow` zaten benzer bir deseni kullanıyor olabilir, teyit edilip birleştirilir).
- Tabular-nums: `.statsStrip b`, `.bentoNum`, `howStepCard` numaraları → `font-variant-numeric: tabular-nums` (+ varsa mevcut mono font token'ı, yoksa `ui-monospace, 'SF Mono', monospace` eklenir — proje genelinde `JetBrains Mono` kullanılıyor olabilir, `hesapla` sayfasındaki deseni teyit et).
- Sadece `src/app/page.module.css` + `src/app/page.tsx` (heroBadge JSX'i) dokunulur, `globals.css`'e yeni token eklenmez.

## Test Planı

- `npx tsc --noEmit`, `npm run lint`, `npx jest --no-coverage` (mevcut 325/325) sıfır hata/kırılma.
- Playwright ile desktop (1920px) + mobil (390px), light + dark tema, tüm bölümler scroll-through ile (whileInView animasyonları tetiklenerek) görsel kontrol — bugünkü oturumda kullanılan script deseni tekrarlanır.
- Nested-glass kontrolü: her yeni/değişen cam yüzeyde `getComputedStyle` ile ebeveyn zincirinde `backdrop-filter` olup olmadığı taranır (bugünkü `NESTED GLASS ELEMENTS` script deseni), toplam opaklık ~%80'i geçen yerler flag'lenir.
- Masaüstü regresyon: hiçbir bölümün masaüstü görünümü bu iş kapsamında bilinçli olarak değişmiyor olsa da (mobil-only değil, tüm ana sayfa) — önce/sonra 1920px screenshot karşılaştırması yapılır, kasıtsız kırılma olmadığı doğrulanır.

## Sıradaki Adımlar (bu spec sonrası)

1. Bu spec onaylanınca `writing-plans` ile uygulama planı yazılır (muhtemelen subagent-driven-development ile task'lara bölünür).
2. AI görsel üretim prompt'ları (kullanıcı ChatGPT image-gen ile kendi görsellerini üretecek) — ayrı, spec-sonrası bir adım.
3. Coolify deploy hâlâ bekliyor (bu iş bitince).
