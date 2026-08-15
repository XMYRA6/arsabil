# Anasayfa Taste-Skill Revizyonu — Tasarım Spec'i (2026-08-15)

## Bağlam ve Problem

Kullanıcı, masaüstü hero renklerinin düzeltilmesinin ardından daha geniş bir istek getirdi: "web ui, özellikle anasayfayı" `taste-skill` (Leonxlnx/taste-skill, proje zaten `.claude/skills/` altında kurulu — `redesign-existing-projects` + `high-end-visual-design`) kullanılarak "AI slop" hissinden arındırmak. Bu spec, `redesign-existing-projects` skill'inin denetim checklist'i `src/app/page.tsx` + `src/app/page.module.css` + `src/app/globals.css` üzerinde çalıştırılarak yapılan denetimin (audit) sonucudur.

**Denetimde bulunanlar:**

**Site-geneli (yalnızca anasayfa değil):**
- Taban font `globals.css:235`'te `'Inter', ui-sans-serif, system-ui, ...` olarak hardcode edilmiş — checklist'in #1 sırada işaretlediği "Browser default fonts or Inter everywhere" deseni.
- **Önemli keşif:** `src/app/layout.tsx:2,13-21` zaten `next/font/google`'dan `Geist`/`Geist_Mono`'yu import edip `--font-geist-sans`/`--font-geist-mono` CSS değişkenlerini `<body>` class'ına bağlıyor (create-next-app varsayılan iskeleti) — ama `globals.css` bu değişkenleri hiç KULLANMIYOR, hâlâ literal `'Inter'` string'i duruyor. Yani font kurulumu zaten YAPILMIŞ durumda, sadece bağlanmamış; yeni paket kurulumu GEREKMİYOR.
- Emoji, fonksiyonel ikon olarak site genelinde **80 dosyada** kullanılıyor (🔒⚡📊🏠🏢⭐📄✓🏛️⚖️🔍 vb.) ve projede hiç ikon kütüphanesi (`lucide-react`, `@heroicons/react`, `@phosphor-icons/react` vb.) kurulu değil — checklist'in en ağır işaretlediği "AI slop" bulgusu.

**Anasayfaya özel (`src/app/page.tsx` / `page.module.css`):**
- `FeaturesGrid` içindeki 4 bento kartının hepsinde sahte iPhone ekran görüntüsü mockup'ı (`.mobileDeviceFrame` + `.mobileStatusBar` → "09:41 ... 5G🔋") — tanınabilir bir "AI SaaS landing page" klişesi, birebir aynı çerçeve 4 kez tekrarlanıyor.
- İki tane gerçek "3 eşit sütun" grid: `.howItWorksGrid` (`grid-template-columns: repeat(3, 1fr)`, satır 1271) ve `.blogGrid` (`grid-template-columns: repeat(auto-fit, minmax(300px, 1fr))`, satır 1785 — bu genişlikte fiilen 3'e düşüyor). Checklist'in "en jenerik AI layout'u" dediği desen.
- Accordion FAQ (`FaqAccordion` bileşeni) — checklist'te açıkça değiştirilmesi istenen bir desen.
- Aynı demo sayısı (`%50.0 Arsa Payı`) hero teaser, Card 1 engine widget'ı ve Card 3 pazar yeri widget'ında BİREBİR aynı tekrarlanıyor — organik değil, kopyala-yapıştır placeholder hissi veriyor.
- `border-radius: 100px` tüm dosyada 23 kez kullanılmış (rozet, buton, teaser bar hepsi tam pil) — restraint yok.
- `FeaturesGrid`'deki 4 kartın üstünde `01`/`02`/`03`/`04` etiketleri var ama bu kartlar ardışık bir süreç DEĞİL, paralel özellikler — sahte sıra numarası.

**Not:** `MarketingHomePage` bileşeni (bu spec'in hedefi) hem masaüstünde HEM DE oturum açmamış/mobil ziyaretçilerde gösteriliyor (`HomePage` içindeki `isDesktopViewport === false && status === 'authenticated'` kontrolü yalnızca GİRİŞ YAPMIŞ mobil kullanıcıyı ayrı `HomeMobile` bileşenine yönlendiriyor — bkz. `page.tsx:831`). Yani bu spec'teki JSX/CSS değişiklikleri `@media (max-width: 768px)` breakpoint'lerini de kapsayacak; ayrı bir "mobil anasayfa" spec'i değil, aynı bileşenin tüm genişliklerdeki hâli. Daha önce tamamlanan mobil "kart dili revizyonu" işi tamamen FARKLI bir bileşene (`HomeMobile.tsx`, sadece giriş yapmış mobil kullanıcılar) aitti ve bu spec'te dokunulmuyor.

## Yaklaşım

### A. Font (site-geneli, düşük risk)
`globals.css:235`'teki `font-family` değerini `var(--font-geist-sans), ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif` olarak değiştir. `layout.tsx`'e DOKUNULMAZ (zaten doğru kurulu). Bu tek satırlık değişiklik TÜM siteyi aynı anda etkiler (istenen davranış — bkz. kullanıcı onayı).

### B. İkon kütüphanesi (bu fazda yalnızca anasayfa kapsamında)
`@phosphor-icons/react` paketini kur. `page.tsx`'teki tüm fonksiyonel emoji kullanımlarını (🔒⚡📊🏠🏢⭐📄✓🏛️⚖️🔍🎯 vb. — tam liste implementasyon sırasında `grep -oE "[🔒⚡📊🏠🏢⭐📄✓🏛️⚖️🔍]" src/app/page.tsx` ile çıkarılır) karşılık gelen Phosphor ikonlarıyla değiştir (tek stroke-weight, `weight="regular"` veya `weight="duotone"` — implementer tutarlı BİR seçim yapıp tüm anasayfada aynı weight'i kullanmalı). Sitenin geri kalanındaki 80 dosyalık emoji kullanımı bu fazın KAPSAMI DIŞINDA (bkz. Kapsam Dışı).

### C. Bento kartları (`FeaturesGrid`)
4 karttaki `.mobileDeviceFrame`/`.mobileStatusBar` sahte telefon çerçevesi TAMAMEN kaldırılır. İçindeki gerçek interaktif/görsel elemanlar (Card 1: alan/KAKS slider + sonuç tile'ları, Card 2: tier seçici + donut chart + progress bar'lar, Card 3: teklif kartı içeriği, Card 4: PDF önizleme) kartın kendi native yüzeyinde (telefon çerçevesi olmadan, kartın mevcut glass/surface stiliyle) gösterilir. `.bentoNum` (01-04) etiketleri kaldırılır — bunlar sıralı adım değil.

### D. How It Works
`.howItWorksGrid`'in `repeat(3, 1fr)` eşit-sütun yapısı, gerçekten ardışık olan bu 3 adımı yansıtan asimetrik bir düzene çevrilir: sol tarafta bağlayıcı bir çizgi/numara sütunu, sağda alternatif hizalanan (zig-zag) adım içerikleri. Numaralandırma (01/02/03) KALIR çünkü bu gerçek bir sıra.

### E. Blog grid
`repeat(auto-fit, minmax(300px,1fr))` 3'lü eşit yapısı, bir öne çıkan (büyük, geniş görsel) + iki küçük yığılmış kart şeklinde asimetrik 2'li bir düzene çevrilir.

### F. FAQ
`FaqAccordion` (dikey collapse) yerine iki sütunlu bir liste: sol sütunda soru başlıkları, sağda ilgili cevap (tıklamada mevcut soru vurgulanır/cevap değişir) — checklist'in önerdiği "side-by-side list" deseni.

### G. Sayı/veri çeşitliliği
Hero teaser, Card 1 ve Card 3'teki birebir aynı `%50.0` değeri farklılaştırılır (ör. `%48.6`, `%51.2` gibi organik, birbirinden farklı ama makul aralıkta sayılar) — aynı `MarketingHomePage` içinde aynı "canlı demo" hissi verilen 3 farklı widget'ın aynı sayıyı tekrarlaması kopyala-yapıştır izlenimi veriyordu.

### H. Border-radius / pil kısıtlaması
`border-radius: 100px` kullanımı SADECE gerçek durum/etiket rozetlerinde (`.bentoTag`, `.miniPill`, `.ctaTrustPill` gibi küçük metin rozetleri) kalır. Kart, buton, teaser bar gibi daha büyük yüzeylerdeki pil-radius'lar dosyada zaten kullanılan 12-24px aralığına çekilir (implementer her selector için mevcut komşu kart/buton radius değerleriyle tutarlı bir değer seçer, örn. `.primaryBtn`/`.secondaryBtn` zaten 14px kullanıyor).

## Dosya Eşlemesi

| Dosya | Değişiklik |
|---|---|
| `src/app/globals.css` | `font-family` satırı Geist değişkenine bağlanır (madde A) |
| `package.json` | `@phosphor-icons/react` bağımlılığı eklenir |
| `src/app/page.tsx` | Emoji → Phosphor ikon (madde B), bento kart JSX'i telefon çerçevesi kaldırılarak sadeleştirilir (madde C), How It Works/Blog/FAQ JSX yapıları yeni düzenlere uyacak şekilde güncellenir (madde D-F), tekrarlanan sayılar farklılaştırılır (madde G) |
| `src/app/page.module.css` | Bento/How-It-Works/Blog/FAQ ile ilgili class'lar (yeni düzenler + kaldırılan `.mobileDeviceFrame` ailesi + ilgili `@media (max-width:768px)` override'ları) güncellenir, `border-radius` değerleri madde H'ye göre gözden geçirilir |
| `src/app/pageStyles.scope.test.ts` | Dokunulan her selector için mevcut regex-tabanlı scope test deseni güncellenir/genişletilir |

## Kapsam Dışı (Non-goals)

- Sitenin geri kalanındaki (dashboard, profil, ilan, pazar yeri vb.) 80 dosyalık emoji→ikon dönüşümü — ayrı bir takip fazı (bu spec'te yalnızca NOT düşülür, uygulanmaz).
- Dashboard/diğer sayfaların bileşen/layout düzeyinde redesign'i — ayrı bir sonraki faz.
- `HomeMobile.tsx` (giriş yapmış mobil kullanıcı deneyimi) — daha önce ayrı bir spec'te (`2026-08-15-mobil-kart-dili-revizyonu-design.md`) ele alındı, bu spec'e dahil değil.
- `SiteChrome`/navbar/footer gibi anasayfa dışı paylaşılan bileşenler — bu spec yalnızca `MarketingHomePage` içeriğini kapsar.
- Yeni bir marka kimliği/renk paleti — mevcut aurora/navy token sistemi (bu oturumda zaten düzeltilen hero renkleri dahil) korunur, yalnızca font/ikon/layout/kompozisyon düzeyinde değişiklik yapılır.

## Test Stratejisi

- Dokunulan her CSS selector için `src/app/pageStyles.scope.test.ts`'teki mevcut regex-tabanlı desen (`pageCss.match(/\.selector\s*\{([^}]*)\}/)`) izlenerek yeni/değişen kurallar test edilir.
- **`npm run build` HER task/commit'ten sonra ZORUNLU** (proje hafızası: Turbopack/lightningcss build-time hataları `npm run dev`/jest'te hiç görünmez — bkz. `feedback_verification_needs_real_build_not_just_dev_or_tests` hafıza kaydı). Yeni npm paketi (`@phosphor-icons/react`) ve font değişikliği özellikle build'i etkileyebilecek türden değişiklikler.
- Playwright ile görsel doğrulama: masaüstü viewport (1920px ve 1280px), açık VE koyu tema, `npm run dev` üzerinden gerçek ekran görüntüsü — özellikle font render'ı, ikon boyutları/hizalaması, yeni bento/how-it-works/blog/FAQ düzenlerinin gerçekten kırılmadığını göstermek için.
