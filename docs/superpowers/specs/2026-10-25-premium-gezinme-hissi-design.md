# Premium Gezinme Hissi (PWA / iOS) — Tasarım

Tarih: 2026-10-25 · Durum: onay bekliyor · Karar sahibi: Emre ("tamamen senin önerilerine bırakıyorum")

## Amaç ve neden

ArsaBil'i iOS'ta (Safari ve ana ekrana eklenmiş PWA) kullananlar bugün donma/kasma yaşamıyor. İstenen: **bu akıcılık bozulmadan**, tüm sayfalarda gezinirken göze "pahalı bir uygulama" hissi vermek. Bugünkü durum (denetim, 2026-10-25): sayfa geçişi yok (anlık değişim), yalnızca 1 `loading.tsx` (çoğu rotada yüklenirken boşluk/eski ekran), alt gezinme çubuğu aktif sekmeyi yalnız renk değiştirerek gösteriyor, basma geri bildirimi 2 CSS dosyasında, global bir "hareketi azalt" kuralı yok. framer-motion yalnız 4 yerde kullanılıyor.

## Kararlar (Emre'nin yönlendirmesi + benim önerim)

- Hissi yaratan şey: **tutarlı, sakin, hafif** hareket. Tek bir zarif dil, her sayfada aynı.
- Yalnız `opacity` ve (gerektiği yerde) `transform` animasyonu; bulanıklık, büyük gölge, filtre, layout animasyonu YOK (iOS performansı).
- Titreşim (haptic) KAPSAM DIŞI: iOS Safari/PWA `navigator.vibrate` desteklemiyor.
- Bu bir **benim önerim**dir; Emre herhangi bir referans uygulama belirtmedi.

## Hedefler

1. **Sayfa girişi:** Rota değiştiğinde yeni sayfa yumuşakça belirir (opacity 0→1, ≈240 ms, `--ease-out`). `app/template.tsx` ile, tüm rotalarda. İlk yüklemede animasyon YOK (LCP/ilk boyama gecikmez). Sarmalayıcı animasyon bittikten sonra elemanın üzerinde `transform` bırakmaz (fixed/sticky çocukların kapsayıcı bloğunu bozmamak için); gerekirse yalnız opacity animasyonu kullanılır.
2. **Yükleme iskeletleri:** Sunucuda veri çeken başlıca rotalara `loading.tsx` + ortak `SayfaIskeleti` bileşeni (varyantlar: liste/kart ızgarası, detay, form/panel). Parıltı (shimmer) yalnız `transform: translateX` ile (arka plan konumu animasyonu değil). Hangi rotaların kapsanacağı: sunucu bileşeni olup veri çeken rotalar (en az: `/marketplace`, `/listing/[id]`, `/arsa-fiyatlari/**`, `/dashboard/**`, `/studio/**`, `/deger`, `/inbox`) — kesin liste uygulayıcı tarafından koddan çıkarılır.
3. **Alt gezinme çubuğunda kayan gösterge:** Aktif sekmenin arka planı sekmeler arasında `transform: translateX` ile kayar (≈320 ms, `--ease-out`); sekme sayısı/genişliği ölçülerek hesaplanır, yeniden boyutlanmada güncellenir. "Hareketi azalt"ta kayma yok, anında geçiş.
4. **Basma geri bildirimi:** Butonlar, sekmeler, kartlar ve tıklanabilir satırlarda `:active` iken hafif küçülme (`scale(0.97)`, ≈120 ms). iOS Safari'nin `:active`'i yalnız sayfada bir `touchstart` dinleyicisi varsa uyguladığı bilinen tuzak için tek bir pasif, boş `touchstart` dinleyicisi kök düzeyde eklenir.
5. **Global "hareketi azalt" güvencesi:** `globals.css`'e, bu işte eklenen tüm hareketleri kapatan tek kural (`prefers-reduced-motion: reduce`); mevcut bileşenlerin kendi kuralları bozulmaz.
6. **(Son sıra, düşük risk) Ham `<img>` → `next/image`:** Kullanıcı/ilan (Cloudinary) görsellerinin gösterildiği yerlerde (en az `ListingCard`, `dashboard/favorites`, `dashboard/listings`, `profile/[userId]/IlanKarti`), görünür bir değişiklik olmadan, `sizes` ile. Diorama görselleri (elle hazırlanmış webp srcset) ve logo/ikon DOKUNULMAZ.

## Hedef dışı

- Titreşim (haptic), aşağı çekip yenileme, kenardan geri kaydırma, sayfa ÇIKIŞ animasyonları, paylaşılan-öğe (shared-element) geçişleri, View Transitions API / `experimental.viewTransition` (belirsiz olgunluk; ilerisi için ayrı değerlendirme).
- Masaüstü yeniden tasarımı (masaüstünde aynı sayfa girişi çalışır, başka değişiklik yok).
- Mevcut framer-motion bileşenlerinin (BottomSheet vb.) davranış değişikliği.
- Yeni renk/tipografi/ikon.

## Anti-hedefler (başarısızlık sayılır)

- iOS'ta herhangi bir takılma/donma ya da kaydırmada gecikme.
- İlk yükleme / LCP / CLS'nin kötüleşmesi; hydration uyarısı.
- Animasyon sırasında veya sonrasında bozulan fixed/sticky öğeler (BottomSheet, StickyActionBar, alt çubuk, toast).
- "Hareketi azalt" açıkken hareket.
- Aynı sayfa içinde aşırı/yarışan animasyonlar ("süs" hissi).

## Kısıtlar

- Stack: Next 16 App Router, React 19.2, CSS modules + `globals.css` tokenları (`--ease-out`, `--dur-ui`); yeni animasyon kütüphanesi eklenmez; mevcut framer-motion'a bağımlılık artırılmaz.
- Test-first (jest + RTL); CSS animasyonlarının varlığı/kapatılması sınıf ve `prefers-reduced-motion` kuralları üzerinden test edilir; gösterge konum hesabı saf bir fonksiyon olarak birim testlenir.
- Görsel/performans doğrulaması: gerçek `next build` + tarayıcıda LCP/CLS karşılaştırması (önce/sonra). **iOS'ta his testi yalnız Emre tarafından yapılabilir** (ajan iOS cihazı göremez); bu bir kabul koşulu olarak raporlanır, otomatik doğrulanmış sayılmaz.
- Dağıtım: Coolify auto-deploy kapalı; push sonrası Emre Redeploy basar.

## Uygulayıcıya bırakılanlar

- Tam süre/eğri ince ayarı (yukarıdaki değerler başlangıç önerisidir).
- `loading.tsx` kapsayacak rota listesi ve iskelet varyantlarının ayrıntısı.
- Kayan göstergenin DOM yapısı (ayrı eleman mı, sekme arkaplanı mı), ölçüm yöntemi.
- Basma efektinin ortak yardımcı sınıf mı yoksa mevcut bileşen CSS'lerine ekleme mi olacağı.
- `next/image` dönüşümünde `sizes` değerleri.

## Builder-check sonrası kararlar (benim kararlarım — Emre gözden geçirecek)

1. **Sayfa girişi ne zaman oynar:** `template.tsx`'in doğal davranışı: her rota segmenti değişiminde (ileri/geri/sekme dahil) yeniden oynar; yalnız query-string değişiminde oynamaz. İlk yüklemede (ilk mount) oynamaz; bunun için istemci sarmalayıcıda "ilk mount" bayrağı kullanılır.
2. **Sarmalayıcı konumu:** `template` yalnız `{children}`'ı sarar (yani `SiteChrome`'daki `<main>` içinde kalır; Navbar, alt çubuk, toast ve footer fade'e girmez). Sayfaların kendi render ettiği fixed/sticky öğeler (StickyActionBar vb.) animasyon süresince (≤240 ms) sayfayla birlikte belirir; bu kabul edilebilir. `will-change` kullanılmaz, `animation-fill-mode: backwards` kullanılır ki bitişte stil kalıntısı olmasın.
3. **Kayan gösterge:** Aktif sekme yoksa gösterge `opacity: 0` ile gizlenir (kayma yok). Sunucu/ilk render ve ölçüm öncesi statik `.active` arka planı yedek olarak kalır; ölçüm tamamlanınca gösterge devralır ve `.active` arka planı bir veri özniteliğiyle kapatılır (görsel sıçrama/hydration uyuşmazlığı olmaz). Sekme seti/genişliği değişirse (nokta, oturum durumu, yeniden boyutlama) yeniden ölçülür. `TabBar` istemci bileşeni olur; `TabBar.test.tsx` ve `BottomNavbar.test.tsx` buna göre güncellenir.
4. **Basma efekti kapsamı:** Global seçici YOK; ortak bir yardımcı sınıf/öznitelik ile **opt-in**. Uygulanacaklar: TabBar sekmeleri, ortak `ui` bileşenleri (Button, Chip, SegmentedControl), ilan kartları (`ListingCard`, `IlanKarti`), `mobile/` altındaki tıklanabilir satır/kart bileşenleri (DataCard, SegmentedTabs). Girdiler, harita kontrolleri, BottomSheet sürükleme tutacağı ve kendi `transform`'u olan öğeler dışarıda.
5. **Kabul çıtası:** Önce/sonra `next build` + `next start` üzerinde aynı yöntemle ölçülür (PerformanceObserver ya da Lighthouse): ana sayfa, `/marketplace`, bir `/listing/[id]`, bir `/arsa-fiyatlari/[il]`. LCP gürültü payını (±%10) aşan kötüleşme olmaz, CLS ≤ 0.02. Ölçüm DB'ye bağlı sayfalarda dev DB (127.0.0.1:5433) ile yapılır.
6. **Skeleton ile fade ilişkisi:** `loading.tsx` iskeleti rota değişince hemen gösterilir; sayfa girişi fade'i iskelet/içerik hangisi önce gelirse onu kapsar (template yeniden mount olduğunda bir kez). Akan içerik iskeletin yerine geçerken ek animasyon yok (anlık değişim) — rekabet eden animasyon olmasın.
