# Hesapla Mobil UX Akışı — İki Fazlı Girdi/Sonuç Ayrımı

## Durum

**Aktif — henüz uygulanmadı.** Bu spec, `2026-07-06-hesapla-mobil-muhur-lacivert-design.md` (görsel kimlik, uygulandı: `feature/hesapla-muhur-lacivert`) ile AYNI branch üzerinde, onun ÜZERİNE inşa edilecek ayrı bir iş. Görsel kimlik "nasıl göründüğü"nü değiştirdi; bu spec "nasıl kullanıldığı"nı (bilgi mimarisi/akış) değiştiriyor.

## Bağlam ve Problem

Mühür Lacivert görsel kimliği tamamlandıktan sonra kullanıcı canlı ortamda test ederken 4 somut UX sorunu tespit etti:

1. **Anlamsız ilk sonuç:** Sayfa açılır açılmaz, hiçbir girdi değiştirilmeden, sessiz varsayılanlarla (140m², %33 arsa payı, Lüks, Orta risk/kâr) hesaplanmış "Minimum Daire Fiyatı" gösteriliyor. Kullanıcı hiçbir şey girmeden bir sonuç görüyor ve bunun neye dayandığını anlamıyor.
2. **Parametreler dağınık/geride:** Gelişmiş ayarlar (risk, kâr, iksa, piyasa fiyatı) accordion'larda, asıl detaylı sonuç+aksiyon bölümü ise sayfanın çok altında; karar vermek için uzun scroll gerekiyor.
3. **Mantık sırası ters:** Hesap Özeti (maliyet dağılımı/hassasiyet/finansal grafikler) aksiyon butonlarının (Rapor Kaydet, Karşılaştır) ALTINDA — kullanıcı özet/analizi görmeden "kaydet"e basma noktasına geliyor.
4. **Tek yönlü geri bildirim:** "Piyasaya Göre %X DAHA UCUZ" rozeti sadece hesap fiyatı piyasa fiyatının altındayken görünüyor; üstüne çıktığında hiçbir şey göstermiyor (sessizce kayboluyor). Kullanıcı Arsa Payı'nı yükselttiğinde fiyatın gerçekten arttığını (doğrulanmış: matematiksel olarak x arttıkça M=Mi/(1-x) ve dolayısıyla FD_total belirgin şekilde artıyor) hiçbir görsel sinyalle takip edemiyor.

Ayrıca inceleme sırasında 2 ek tekrar/karmaşa bulundu (kullanıcı onayladı, kapsama dahil):
- "Minimum Daire Fiyatı" iki kez gösteriliyor: `topResultCard` (üstte) ve `blueBox` (mainPanel, aşağıda) — aynı `FD_total` değeri.
- "Arsa Payı" slider'ı iki kez var: üstteki girdi alanında (`RangeSlider` bileşeni) ve `mainPanel` içinde (native `.sliderArea`) — ikisi de aynı `landShareRatio` state'ini kontrol ediyor.

Kullanıcı ayrıca `Arsabil Denklemleri.docx` dokümanını referans göstererek şunu vurguladı: parametre sayısı zamanla artacak (yeni metrikler eklenecek), bu yüzden "gir → hemen hesapla" değil, "önce bazı metrikleri elle seçip gir, sonra sonuçları listele" modeline geçmenin daha ölçeklenebilir olacağını düşünüyor. Aynı doküman, ürünün temel değer önerisinin **canlı/interaktif hesaplama** (slider oynatınca anında güncellenen sonuç — "adam kendi karar versin") olduğunu da gösteriyor. Bu ikisi arasındaki denge bu spec'in ana kararı.

## Karar: İki Fazlı Görünürlük (Tam Wizard Değil)

Sayfa tek bir scroll akışı olarak kalır (adım/ekran geçişi, URL değişimi yok), ama sonuç bölümünün görünürlüğü gate'lenir:

- **Faz 1 — Girdi (açılışta görünen tek şey):** Yapı Standardı, Daire Metrekaresi, Arsa Payı slider'ı + Gelişmiş Ayarlar (3 accordion: Formül Parametreleri, Proje Maliyet ve Riskleri, Piyasa Analizi). Sonuç, Hesap Özeti, aksiyon butonları HİÇ görünmez. En altta büyük, birincil (brass) bir **"Sonuçları Göster"** butonu.
- **Faz 2 — Sonuç ("Sonuçları Göster"a basılınca açılır):** Sonuç kartı (Canlı Mühür + çift yönlü rozet) → Arsa Fiyatı stat kartı + Piyasa Değerine Göre grafiği + konum seçici → Hesap Özeti (3 grafik) → Aksiyon butonları (Rapor Kaydet, PDF İndir, Karşılaştır, sticky CTA).

Faz 2 açıldıktan sonra **tamamen canlı** kalır: herhangi bir girdi değişince sonuç anında güncellenir (mevcut mimari zaten böyle çalışıyor — `useEffect` her input değişiminde `CalculatorEngineV2.calculate` çağırıyor; bu davranışa dokunulmuyor, sadece Faz 2 bölümünün görünürlüğü kontrol ediliyor). Faz 2 bir kez açıldıktan sonra **geri kapanmıyor** (session boyunca açık kalır — geri "gizle" butonu istenmedi, YAGNI).

**"Sonuçları Göster" butonu kuralı:** her zaman tıklanabilir, hiçbir alan zorunluluğu/validasyonu yok (motor zaten varsayılanlarla çalışıyor; "kasıtlı eylem" butona basma hareketinin kendisinden geliyor, doldurulan alan sayısından değil).

Bu karar, önceki "Varsayılan Senaryo etiketi ekle" fikrinin yerini alır (madde 1'i daha kökten çözüyor — artık gerçekten kullanıcı bir eylemde bulunmadan sonuç hiç görünmüyor, kozmetik bir etikete gerek kalmıyor) ve madde 2'yi de otomatik çözer (Faz 1'de SADECE girdiler var, dikkat dağıtıcı sonuç/grafik yok).

## Tekil Sonuç ve Slider Gösterimi

- `topResultCard` (mobil-only, Faz 2'nin ilk öğesi) tek "Minimum Daire Fiyatı" gösterimi olur. `blueBox` (mainPanel'in başındaki fiyat hero'su ve TL/m² tekrarı) **kaldırılır** — `mainPanel`'in geri kalanı (Arsa Fiyatı stat kartı, Piyasa Değerine Göre `PriceEvaluationChart`, `LocationSelector`) kalır, bunlar farklı bilgi taşıyor.
- Mobilde "Arsa Payı" için tek slider kalır (üstteki girdi alanındaki `RangeSlider` bileşeni). `mainPanel` içindeki native `.sliderArea` (ikinci "Arsa Payı" kontrolü) **kaldırılır**.
- Bu kaldırmalar **yalnızca mobil görünüm** için — masaüstü (`.desktopSidebar`, masaüstü `mainPanel` düzeni) değişmez, aynı "mobil-only = media query içinde / mobil-only JSX dalı" prensipleri geçerli (bkz. Mühür Lacivert spec'i).

## Çift Yönlü Fiyat Rozeti

- Mevcut rozet (yeşil, "Piyasaya Göre: %X DAHA UCUZ") sadece `manualMarketPrice > FD_total` iken görünüyor.
- Yeni: `FD_total > manualMarketPrice` durumunda **kırmızı** (`--red` token, mevcut semantik renk, dokunulmuyor) bir karşıt rozet: "Piyasaya Göre: %X DAHA PAHALI".
- İki durum da aynı animasyon davranışını paylaşır (Task 5'teki `SealBadge`'in genişletilmiş hâli): görünürlük durumu değiştiğinde (hangi rozet olursa olsun, ya da ucuzdan pahalıya geçişte) tek seferlik "damga oturma" animasyonu, `prefers-reduced-motion`'a saygılı.
- İki rozetten sadece biri aynı anda görünür (fiyat ya piyasanın altında ya üstünde ya da tam eşit — eşit durumda hiçbiri görünmez, mevcut davranış gibi `> 0` katı eşitsizlik kullanılır).

## Faz Geçişi — Teknik Yaklaşım

- Yeni bir boolean state: `isResultsRevealed` (varsayılan `false`), "Sonuçları Göster" butonuna tıklanınca `true` olur, bir daha `false`'a dönmez.
- Hesaplama motoru (`useEffect` + `CalculatorEngineV2.calculate`) **state'ten bağımsız her zaman çalışmaya devam eder** — sadece Faz 2'nin JSX'inin görünürlüğü `isResultsRevealed`'a bağlanır. Bu, kullanıcı "Sonuçları Göster"a bastığı an sonucun zaten hazır olmasını sağlar (gecikme yok).
- Geçişte kısa bir açılma animasyonu (framer-motion, Task 5'teki `useReducedMotion` deseniyle tutarlı).
- Bu değişiklik yalnızca mobil görünümü etkiler — masaüstünde Faz 1/Faz 2 ayrımı yoktur, tüm bölümler her zaman görünür kalır (masaüstünün zaten yan yana 2 kolonlu düzeni var, uzun scroll problemi mobile özgü).

## Kapsam Dışı

- Masaüstü görünüm — değişmez.
- Gerçek çok adımlı wizard (ayrı ekranlar/URL'ler) — kullanıcı bunu istemedi, tek sayfa + görünürlük gate'i tercih edildi.
- Yeni parametre eklenmesi (dokümanda bahsedilen gelecekteki metrikler) — bu spec'in kapsamı değil, mevcut parametre setiyle akış düzenlemesi.
- Faz 2'yi tekrar gizleme/"girdilere geri dön" özelliği — istenmedi.
- listing/[id], marketplace, dashboard sayfaları — kapsam dışı (Mühür Lacivert spec'iyle aynı sınır).

## Test Planı

- Mevcut jest paketi kırılmadan geçmeli.
- Yeni testler: (1) `isResultsRevealed` başlangıçta `false`, Faz 2 JSX'i render edilmiyor/gizli; (2) butona tıklayınca `true` olup Faz 2 görünür oluyor; (3) `true` olduktan sonra bir input değişikliği `isResultsRevealed`'ı etkilemiyor (hep `true` kalıyor); (4) çift yönlü rozet — market fiyatı FD_total'ın altındayken yeşil/ucuz, üstündeyken kırmızı/pahalı, tam eşitken ikisi de yok.
- Mobil e2e smoke genişletilerek yeni gate'in yatay taşma yaratmadığı ve masaüstünün etkilenmediği doğrulanır.
