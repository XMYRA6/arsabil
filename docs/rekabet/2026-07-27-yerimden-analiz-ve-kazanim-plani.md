# yerimden.com Rekabet Analizi ve ArsaBil Kazanım Planı

**Tarih:** 2026-07-27
**Yöntem:** Canlı Playwright oturumu — 12 sayfa gezildi, 6 sorgu gerçek veriyle test edildi, ağ trafiği (API çağrıları) yakalandı.
**Kaynak kanıtlar:** `scratchpad/queries.log`, `aimap.log`, ekran görüntüleri (`q-*.png`).

---

## 1. yerimden.com nedir?

Bir **arsa ilan pazaryeri** (marketplace). ArsaBil'in *fizibilite motoru* konumundan farklı bir kategoride ama aynı kullanıcıyı hedefliyor: arsa sahibi ve arsa yatırımcısı.

- Şirket: Yerimden Gayrimenkul Bilişim Ltd. Şti. (Küçükçekmece/İstanbul), VKN 9490877848
- Ödeme: Garanti BBVA Sanal POS, 3D Secure
- Stack (gözlemlenen): **Next.js (App Router, RSC)**, **MapLibre GL** + OSM + Esri uydu, PWA (`manifest.webmanifest`), tema rengi `#1d622f` (koyu yeşil)
- **Olgunluk: çok erken.** Tüm Türkiye'de **14 aktif ilan** var (Edirne 7, Kırklareli 5, Tekirdağ 2). "0+ aktif dopingli ilan" yazıyor. Yani ürün kabuğu hazır, içerik yok.

### Sayfa envanteri

| Yol | İçerik |
|---|---|
| `/` | Arama kutusu (il/ilçe/min-max fiyat), öne çıkan ilanlar, imar türü hızlı filtreleri |
| `/ilanlar` | Filtre paneli + liste + sıralama |
| `/harita` | MapLibre kümeleme haritası, TKGM parsel sınırı katmanı |
| `/ilan/[uuid]` | İlan detayı — **en zengin sayfa** (aşağıda) |
| `/piyasa` | İl/ilçe bazlı ortalama fiyat raporu |
| `/kredi` | 6 banka konut/ihtiyaç kredisi taksit karşılaştırma |
| `/deger-raporu` | **Ücretli** YZ değer raporu (Temel 50₺ / Detaylı 150₺) |
| `/doping` | **Ücretli** ilan öne çıkarma (99₺–599₺) + "🔴 Acil Satılık" rozeti (349₺–1.500₺) |
| `/firsat-alarmi` | Kayıtlı filtre + yeni ilan bildirimi (üyelik gerektiriyor) |
| `/kat-karsiligi` | Kat karşılığı ilan türü açıklama sayfası |
| `/blog`, `/yardim`, `/ilanlar/istanbul` … | SEO içerik + şehir landing sayfaları |
| Yasal set | Gizlilik, KVKK, Çerez, Mesafeli Satış, Ön Bilgilendirme, İptal-İade |

---

## 2. Test edilen sorgular — sonuçlar

### 2.1 Kredi hesaplama (`/kredi`) ✅ çalışıyor
2.500.000 TL / 120 ay girdim → 6 banka anında sıralandı (Ziraat %3.19 → 81.635 TL/ay … QNB %3.62 → 91.787 TL/ay). İhtiyaç kredisi sekmesi vade setini 36 aya çekiyor.
**Not:** "Toplam maliyet" etiketi = *toplam geri ödeme − anapara*. Tutarlı ama yanıltıcı bir etiket; ArsaBil aynı hatayı yapmasın.

### 2.2 Piyasa raporu (`/piyasa`) ✅ çalışıyor, veri zayıf
Edirne seçtim → 7 ilan, ort. ₺980.000, ort. ₺1.528/m², ilçe kırılım tablosu (İpsala 7 ilan). Türkiye geneli: en yüksek Tekirdağ/Muratlı ₺5.964/m², en düşük Kırklareli/Pınarhisar ₺51/m².
API: `GET /api/ilanlar/stats?il=Edirne`. Veri **kendi ilanlarından** türetiliyor — 14 ilanla istatistik anlamsız, ama mimari doğru.

### 2.3 İlan filtreleri (`/ilanlar`) ✅ çok kapsamlı
İlan türü (satılık/kiralık/kat karşılığı/kooperatif-hisse), konum, fiyat, alan, **imar durumu (17 seçenek)**, **tapu türü (15 seçenek)**, **altyapı (yol/elektrik/su)**, "Sadece öne çıkan", "🚨 Acil satılık". Sıralama: en yeni/eski/ucuz/pahalı/**en yüksek skor**.

### 2.4 İlan detayı (`/ilan/[uuid]`) ⭐ **en değerli sayfa**
Tekirdağ/Muratlı 830 m², ₺4.950.000 ilanında gözlemlenenler:
- **Ada/Parsel kimliği** görünür (Ada: 0 — Parsel: 1871)
- **"Parsel sınırı doğrulandı (TKGM)"** — gerçek parsel poligonu haritada yeşil çiziliyor; doğrulanamayan parselde kırmızı yaklaşık alan
  → `GET /api/tkgm/parsel?lat=…&lng=…&il=…&ilce=…&mahalle=…&ada=…&parsel=…`
- **4 harita sekmesi:** Konum/Parsel · **İmar Durumu** · **e-Plan** · Yakın Çevre
  → `GET /api/imar-proxy?layer=uip|nip|uip-sinir&bbox=…` — **e-Plan/TUCBS resmi imar planı** rasterı; UIP (1/1000) ve NIP (1/5000) katmanları, EK-1D renk lejantı ile
- **AFAD deprem tehlikesi:** PGA 0.280g → "Orta Risk" (il düzeyinde, 475 yıl referansı)
- Altyapı checklist (doğalgaz/elektrik/su/asfalt/stabilize/kanalizasyon/fiber)
- **Sayfaya gömülü kredi hesaplayıcı, ilan fiyatıyla ön-doldurulmuş** (4.950.000 TL hazır geliyor) — çok akıllı bir dönüşüm hamlesi
- Görüntülenme/favori sayaçları + "her 50 favoride bildirim" eşiği (sosyal kanıt)
- **Soru & Cevap** (herkese açık, telefon/e-posta paylaşımı yasak)
- Yazdır / WhatsApp / X / Facebook / Link kopyala
- Alt bantta **"YZ Destekli Değer Raporu — 50₺'den başlar"** satış kutusu

### 2.5 Harita (`/harita`) ✅ çalışıyor
MapLibre + OSM, zoom 13+ Esri uydu, ilan kümeleme, TKGM parsel sınırı katmanı. İlan türü filtresi harita üstünde.

### 2.6 AI Arsa Danışmanı ⚠️ **sadece bir arama botu**
İki teknik soru sordum:
> "830 m² arsam var, müteahhit %40 teklif etti, arsa payım ne olmalı?"
> "Emsal (KAKS) 1.5 ise kaç m² inşaat çıkar, bana kaç daire düşer?"

**Cevap: hiçbir hesap yapmadı** — her ikisinde de ilgisiz ilan kartları listeledi (Edirne İpsala arsaları). `POST /api/ai-chat` 200 dönüyor, yani çalışıyor; ama görevi ilan arama + doping satışı. Kat karşılığı matematiği yapamıyor.

**Bu, ArsaBil'in en net üstünlüğü.**

---

## 3. Konumlandırma: kim nerede güçlü

| | yerimden | ArsaBil |
|---|---|---|
| Kimlik | Arsa **ilan pazaryeri** | Kat karşılığı **fizibilite motoru** |
| Fizibilite matematiği | ❌ yok (AI bile yapamıyor) | ✅ Engine v2, formül spec'ine doğrulanmış |
| Senaryo karşılaştırma | ❌ | ✅ `/compare`, projeler, senaryolar |
| Teklif / müzakere akışı | ❌ (sadece Q&A) | ✅ Teklif sistemi, `offeredShare`, mesajlaşma |
| PDF rapor | Ücretli (50/150₺) | ✅ var (FREE 10/ay) |
| **Parsel kimliği (ada/parsel)** | ✅ | ❌ **şemada yok** |
| **TKGM parsel sınırı doğrulama** | ✅ | ❌ |
| **e-Plan / TUCBS imar katmanı** | ✅ UIP + NIP | ❌ (imar sadece kullanıcı beyanı) |
| **AFAD deprem verisi** | ✅ (il düzeyi) | ❌ |
| **Gerçek koordinat** | ✅ | ❌ **`MapView.tsx:246` — lat/lng yoksa rastgele İstanbul koordinatı üretiyor** |
| Banka kredi karşılaştırma | ✅ 6 banka | ❌ (iç `finance/engine.ts` var, banka tablosu yok) |
| Halka açık piyasa raporu | ✅ | ⚠️ veri var ama **sadece admin'de** (`/admin/district-prices`) |
| Fırsat alarmı | ✅ | ❌ (bildirim altyapısı hazır) |
| Tek seferlik satın alma | ✅ (rapor + doping) | ❌ (sadece FREE/PRO abonelik) |
| Şehir SEO sayfaları | ✅ | ❌ |
| İçerik/likidite | ❌ **14 ilan** | ❌ benzer |

**Sonuç:** yerimden'i ilan sayısında yenmek anlamsız (ikimizde de likidite yok). Yenilecek yer **veri derinliği + karar kalitesi**. Onların gösterdiği veriyi (parsel, imar planı, deprem) ArsaBil **fizibilite hesabına girdi** yapabilir — onlar sadece gösteriyor.

---

## 4. Kazanım planı — öncelik sırası

Sıralama: **etki ÷ efor**, ve teknik bağımlılık zinciri.

### 🔴 T0 — Temel: Parsel Kimliği (her şeyin önkoşulu)
`Listing` modeline `lat`, `lng`, `mahalle`, `ada`, `parsel`, `parcelVerified` alanları + ilan formunda harita üzerinden konum seçme + TKGM doğrulama.
**Neden önce:** `MapView.tsx:246` bugün rastgele koordinat üretiyor — harita **sahte**. Ayrıca imar katmanı, deprem verisi, yakın çevre, gerçek m² doğrulaması hep koordinata bağlı.
**Efor:** ~1,5 gün (migration + form + TKGM proxy + geriye dönük veri).

### 🔴 T1 — TKGM parsel sınırı doğrulama
Koordinattan parsel poligonu çek, haritada çiz, "Parsel sınırı doğrulandı" rozeti ver. Beyan edilen m² ile TKGM alanını karşılaştır → **uyuşmazlık uyarısı** (yerimden'de yok, bizde olabilir).
**Efor:** ~0,5 gün (T0 sonrası). **ArsaBil farkı:** doğrulanan alanı fizibilite girdisi (Ma) olarak kullan.

### 🔴 T2 — e-Plan / TUCBS imar katmanı
`/api/imar-proxy?layer=uip|nip&bbox=` deseniyle resmi 1/1000 ve 1/5000 planı harita katmanı + EK-1D renk lejantı.
**Efor:** ~1 gün. **ArsaBil farkı:** hesapla sayfasındaki **emsal/KAKS varsayımını görsel olarak doğrulatır** — "girdiğiniz emsal, plandaki fonksiyonla uyumlu mu?" Bu, ürünün en zayıf noktasını (kullanıcının emsali doğru bilmesi) kapatır.

### 🟠 T3 — Banka kredi karşılaştırma + fizibiliteye gömme
6-8 banka oranı (yönetilebilir tablo/admin ayarı), taksit hesabı, **ilan fiyatı ve fizibilite sonucu ile ön-doldurulmuş**.
**Efor:** ~0,5–1 gün (`src/lib/finance/engine.ts` zaten var). **ArsaBil farkı:** kat karşılığında müteahhidin **finansman maliyetini** fizibiliteye katabiliriz — yerimden bunu yapamaz.

### 🟠 T4 — Halka açık Piyasa Raporu (`/piyasa`)
`admin/district-prices` verisi **zaten mevcut** — public sayfaya aç: il seç → ilçe ort. ₺/m² tablosu, en yüksek/düşük ilçe, imar tipi dağılımı.
**Efor:** ~0,5 gün. En düşük eforlu kazanım. SEO değeri yüksek.

### 🟠 T5 — Fırsat Alarmı
Kayıtlı filtre + eşleşen yeni ilanda bildirim. `Notification` altyapısı + e-posta (Resend) **zaten var**.
**Efor:** ~0,5 gün. Retention'a doğrudan etki.

### 🟡 T6 — İlan detay zenginleştirme paketi
Tek gövdede: altyapı checklist (yapılandırılmış alan, fizibilite maliyet girdisi), herkese açık Soru&Cevap, görüntülenme/favori sayacı, paylaş/yazdır butonları, ilan kartında fizibilite skoru + **"en yüksek skor" sıralaması** (`/api/listings` bugün skor döndürmüyor).
**Efor:** ~1 gün.

### 🟡 T7 — AFAD deprem tehlikesi
yerimden **il düzeyinde** PGA gösteriyor. Biz koordinat düzeyinde çekip **risk katsayısını fizibilite skoruna girdi** yapabiliriz (mevcut risk seviyesi sistemiyle birleşir).
**Efor:** ~0,5 gün (T0 sonrası).

### 🟢 T8 — Şehir/ilçe SEO landing sayfaları
`/marketplace/istanbul` tarzı statik-üretilmiş sayfalar + mevcut blog altyapısı.
**Efor:** ~0,5 gün.

### ⚪ T9 — Para kazanma (bu hafta DIŞI önerisi)
Tek seferlik satın alma (değer raporu 50/150₺ tarzı) ve doping. **Ödeme entegrasyonu (sanal POS + mesafeli satış/ön bilgilendirme/iptal-iade yasal seti) tek başına 2+ gün** ve hukuki metin gerektirir. Abonelik modeline ek olarak sonraki sprint.

---

## 5. Bu hafta için gerçekçi sıralama

| Gün | İş |
|---|---|
| 1 | **T0** parsel kimliği (şema + form + migration) |
| 2 | **T0** bitiş + **T1** TKGM doğrulama + m² uyuşmazlık uyarısı |
| 3 | **T2** e-Plan imar katmanı + emsal doğrulama bağlantısı |
| 4 | **T4** piyasa raporu + **T5** fırsat alarmı (ikisi de mevcut altyapıyı kullanıyor, hızlı) |
| 5 | **T3** kredi karşılaştırma + **T7** deprem rozeti |
| Taşan | **T6** ilan zenginleştirme, **T8** SEO — gelecek sprint |

T9 (ödeme) bu haftaya sığmaz; zorlanırsa T2 veya T6 düşer.

---

## 6. Kopyalanmaması gerekenler

- **Şişirilmiş istatistikler:** "5× görüntülenme", "%312 alıcıya ulaşım", "%180 satış hızı" — hemen altında "0+ aktif dopingli ilan" yazıyor. Doğrulanamaz iddia, güveni yer.
- **Boş sitede reklam alanı:** her sayfada "ÖRNEK ALAN — Reklamınız burada görünebilir · 728×90 px" placeholder'ları. Ürünü yarım gösteriyor.
- **"Toplam maliyet" etiketi:** anaparayı dışlıyor ama adı öyle demiyor. Bizim fişte `FD_total`/`×K` satırları zaten net — bu netliği koru.
- **Karar veremeyen AI:** "YZ destekli" iddiası ile ilan listeleyen bot arasındaki boşluk. ArsaBil'de AI eklenirse **hesap motoruna bağlı** olmalı, yoksa hiç olmamalı.

---

## 7. Sonraki adım

Her T maddesi ayrı bir `brainstorming → spec → plan → subagent-driven-development` turu olarak ele alınmalı. **T0 + T1 tek spec'te birleştirilmeli** (parsel kimliği ve doğrulaması ayrılamaz).

**Not — devam eden iş:** `worktree-faz2-5-muhur-kimlik` worktree'sinde Faz 2.5 (akış sayfalarına mühür kimliği) Task 1-3 tamamlanmış, Task 4 (inbox) commit edilmemiş halde bekliyor. Ayrıca `fix/anasayfa-takip-kalemleri` branch'i merge kararı bekliyor.
