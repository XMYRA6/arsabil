# Alt-proje: Akif-5c — WhatsApp Proje Kartları, Parsel Dosyası ve Görsel Anlama

**Tarih:** 2026-10-15
**Branch:** `codex/professional-ui-and-land-cost`
**Üst bağlam:** `docs/superpowers/specs/2026-09-15-akif-5-whatsapp-design.md` (Akif-5, WhatsApp tam sohbet Akif), `docs/superpowers/specs/2026-09-15-akif-3-arsa-dosyasi-design.md` (web hafızası). Akif-5 bu spec'te DEĞİŞTİRİLMEZ, üzerine eklenir.

## 0. Amaç ve onaylanan kararlar

**Amaç:** WhatsApp'taki müşteri (a) arsa bilgisini yazıyla ya da **görselle** (parsel sorgu ekran görüntüsü, tapu, imar durumu, hatta mesaj ekran görüntüsü) verir, (b) Akif bu bilgilerle ArsaBil motorunda **tarihli proje kartı** oluşturur, (c) aylar sonra "Ocak'ta konuştuğumuz proje" gibi bir ifadeyle ilgili projeyi bulur, **revizyon geçmişini** özetler ve "değiştirelim mi, yeni senaryo mu?" diye sorar, (d) önceden verilmiş bilgiyi (imar vb.) tekrar sormaz; yalnız **bayatlamışsa** teyit ister.

### Onaylanan kararlar (2026-10-15 brainstorming)

- **Kapsam:** Üç alt proje, tek spec, aşamalı teslim: **B → C → A** (bkz. §8).
- **Bilgi / iş ayrımı:** Parsel bazlı **Parsel Dosyası** (bilgi, müşteri+parsel başına tek, tarihli olgular) + proje bazlı **Proje Kartı** (iş, çoklu, tarihli, silinmez/ezilmez). Birleştirme (tevhid) yalnız projede olur; Parsel Dosyaları bağımsız kalır.
- **Kimlik:** Telefon numarasına bağlı veri. Üye olmayan müşteri ücretsiz sorgu ve hesaplama sohbeti yapar; **kalıcı kayıt için arsabil.com üyeliği** istenir. Üyelik sonrası telefondaki tüm veri hesaba bağlanır; web ve WhatsApp aynı veriyi görür.
- **Revizyon günlüğü:** Her girdi değişikliği (ör. arsa payı %40 → %50, arsa alanı değişimi) zaman damgalı kayıt olur; Akif projeyi en yeniden en eskiye kısa özetler ve sonunda "değişiklik mi, yeni senaryo mu?" diye sorar.
- **Bayatlık:** Taze → sessizce kullan; bayat → teyit iste; yok → sor. Kararı **kod** verir, LLM vermez.
- **İlke korunur:** LLM hesap yapmaz; sayıyı motor ve kayıt üretir, model yalnız cümleyi kurar.
- **Gizlilik:** Gönderilen görseller **saklanmaz**, yalnız okunan alanlar saklanır. TC kimlik numarası hiç saklanmaz. Malik adı yalnız müşteri açıkça isterse tutulur.

### Kapsam DIŞI

- Resmî e-imar/belediye entegrasyonu (imar bilgisini sistemin kendisinin çekmesi) — ayrı, büyük alt proje.
- Sahibinden scraping (ArsaBil kararı: ertelendi).
- Sesli WhatsApp mesajı, konum mesajı işleme.
- Birden fazla müşterinin aynı projeyi ortak düzenlemesi.
- Mevcut web `Project`/`Scenario` ekranlarının yeniden tasarımı (yalnız opsiyonel bağlama, §3.4).
- Akif-5b (haftalık özet/uyarı cron'u) — dokunulmaz.

## 1. Mimari — genel bakış

```
WhatsApp müşteri  (metin | görsel)
  → POST /api/whatsapp/webhook   (imza + parseInbound; parseInbound `image` türünü ve media id'yi artık taşır)
       ▼ after()
  runWhatsappAkifTurn  (Akif-5; idempotency, rate-limit, DURDUR, bütçe — DEĞİŞMEZ)
       │   + yeni araçlar:  lookupParcel (var) · extractFromImage · rememberFact ·
       │                    findProjects · summarizeProject · createProject · updateProject
       │   + her turda: kod bayatlık hesabı → modele {taze, bayat, eksik} olgu listesi
       ▼
  Servis katmanı (saf, test edilebilir):  parselDosyasi · projeKarti · revizyon · freshness · claim
       ▼
  Prisma: ParselDosyasi · ParselOlgu · ProjeKarti · ProjeRevizyon · PhoneClaim
```

Web tarafı aynı servis katmanını kullanır (üyelikten sonra "Akif Projelerim" görünümü).

## 2. Veri modeli (yeni modeller; mevcut `Project`/`Scenario` değişmez)

Sahiplik iki alanla ifade edilir: `ownerPhone String` (her zaman dolu) ve `userId String?` (üyelik bağlanınca dolar). Sorgular önce `userId`, yoksa `ownerPhone` ile süzer.

- **`ParselDosyasi`:** `id, ownerPhone, userId?, il, ilce, mahalle, ada, parsel, createdAt, updatedAt`. Benzersiz: `(ownerPhone, il, ilce, mahalle, ada, parsel)`.
- **`ParselOlgu`:** `id, parselDosyasiId, key (areaSqm | imarDurumu | emsal | katAdedi | taks | hmax | malik | daireFiyati150 ...), value Json, source (tkgm | goruntu | kullanici | ilan), recordedAt, supersededAt?`. Değer değişince eski satır `supersededAt` alır, yeni satır eklenir (geçmiş silinmez).
- **`ProjeKarti`:** `id, ownerPhone, userId?, name?, createdAt, updatedAt, inputs Json (güncel girdiler), result Json? (son motor çıktısı), status, projectId? (üyelik sonrası mevcut web Project'ine opsiyonel bağlantı)`. Bir karta bağlı parseller `ProjeKartiParsel (projeKartiId, parselDosyasiId)` ile tutulur (tevhid desteği).
- **`ProjeRevizyon`:** `id, projeKartiId, field, oldValue Json?, newValue Json, changedAt, channel (whatsapp | web), note?`. Kart ilk oluşturulurken ilk girdiler de revizyon olarak yazılır.
- **`PhoneClaim`:** `id, phone, tokenHash, expiresAt, usedAt?, userId?` — tek kullanımlık eşleştirme bağlantısı.

## 3. Bileşenler

### 3.1 Bayatlık politikası (`freshness.ts`, saf)
Olgu türü başına ömür (başlangıç değerleri, env/sabitle ayarlanabilir): `areaSqm`, ada/parsel, il/ilçe/mahalle → süresiz; `imarDurumu`, `emsal`, `katAdedi`, `taks`, `hmax` → 180 gün; `daireFiyati*` → 45 gün; `malik` → 365 gün. Fonksiyon `classify(olgular, now) → { taze[], bayat[], eksik[] }` döner. Sistem prompt'una "taze olanı tekrar sorma; bayat olanı tarihiyle birlikte teyit et; eksik olanı sor" kuralı eklenir (WhatsApp'a özel `extraSystemPrompt`, Akif-5 deseni).

### 3.2 Proje bulma (`findProjects`)
Argümanlar: `dateFrom?, dateTo?, nameLike?, parcel?`. Model "Ocak'ta", "15 Ekim", "geçen ay" ifadesini **tarih aralığına** çevirir; göreli ifadeler **Europe/Istanbul** saatine göre **kodla** doğrulanıp çözülür (model ham tarih aralığı verir, sunucu now'ı kendisi bilir). Tek eşleşme → doğrudan; birden fazla → aday listesi (tarih, isim, parsel) sunulur, **tahmin edilmez**; sıfır → "bulamadım" ve yakın tarihli projeler önerilir. Telefon/hesap dışındaki veriye erişim yoktur (sahiplik filtresi sorgunun parçasıdır).

### 3.3 Özet (`summarizeProject`)
Girdi: proje id. Çıktı: revizyonlar **en yeniden en eskiye** sıralı, alan başına `eski → yeni`, tarihli yapılandırılmış kayıt. Rakamlar yalnız kayıttan gelir (mevcut `numberSafety` kuralı: modelin yazdığı her sayı araç çıktısında bulunmalı). Özetin sonunda sabit soru: "Bunun üzerinde değişiklik yapalım mı, yoksa yeni bir senaryo mu açalım?" Cevaba göre `updateProject` (revizyon yazar) veya `createProject` (yeni kart, eski dokunulmaz).

### 3.4 Üyelik eşleştirme (`claim`)
1. Müşteri "kaydet" der ve üye değilse Akif `PhoneClaim` oluşturur, `https://www.arsabil.com/akif/baglan?t=<token>` bağlantısını yollar (token 32 bayt rastgele, DB'de yalnız hash, **15 dk**, tek kullanım).
2. Web sayfası üye ol / giriş yap akışına yönlendirir, bitince token'ı tüketir, `phone ↔ userId` eşleşir, telefondaki tüm `ParselDosyasi`/`ProjeKarti` kayıtlarının `userId`'si doldurulur.
3. İsteğe bağlı: kart mevcut web `Project`'ine kopyalanır (`projectId` dolar) ki Projelerim ekranında da görünsün. Revizyon günlüğü yeni tablolarda kalır.
4. Üye olmadan "kaydet" demeyen müşterinin geçici sohbet durumu Akif-5'teki gibi kalır; kalıcı kart yaratılmaz.
5. Aynı telefona ikinci hesap bağlanamaz (benzersiz). Token tekrar kullanılırsa/süresi dolarsa web sayfası net hata gösterir, yeni bağlantı istenebilir.

### 3.5 Görsel anlama (`extractFromImage`, Aşama A)
`parseInbound` `image` mesajını `mediaId` ile taşır. WhatsApp Cloud API'den medya indirilir (bellekte, diske/DB'ye yazılmaz), vision modeline verilir; çıktı **şemalı JSON**: alan listesi, her alan için `confidence` ve `sourceKind (parselSorgu | tapu | imar | mesajEkrani | bilinmiyor)`. Akif **yazmadan önce okuduğunu gösterip onay ister**: "Şunu okudum: …, doğru mu?" Onaylanan alanlar `rememberFact` ile Parsel Dosyası'na `source: goruntu` yazılır. Düşük güvenli/okunamayan alan atlanır ve müşteriden istenir, uydurulmaz. TC kimlik numarası çıktı şemasında yoktur.

### 3.6 Daire fiyatı doğrulama (Aşama C)
İmarı bilmeyen müşteri için bölgenin konut ilanlarından medyan daire fiyatı hesaplanır; Akif "Bu bölgede 150 m² daire ortalama ~7 milyon, doğru mu?" diye sorar. Onay → fiyat olgu olarak (`source: ilan`) kaydedilir; düzeltme → müşterinin değeri (`source: kullanici`) esas alınır. Veri yetersizse (örneklem küçük) Akif doğrudan fiyatı sorar, tahmin sunmaz. Gereksinim: konut ilanı taraması + bölge bazlı daire fiyat istatistiği (bugün yalnız arsa tarafında var; ayrı iş kalemi, §8).

## 4. Hata ve kenar durumları
- Webhook idempotency, rate-limit, bütçe guard'ları Akif-5'ten aynen geçerli; görsel okuma tur başına bütçeye dahil (aynı `wa:` havuzu), görsel başına üst sınır (boyut/adet) uygulanır.
- Desteklenmeyen medya (video, ses, belge): kısa "şu an yalnız metin ve fotoğraf okuyabiliyorum" yanıtı.
- Vision çıktısı şemaya uymazsa: araç hata döner, Akif müşteriden yazıyla ister.
- Sahiplik ihlali denemesi (başka telefonun proje id'si): sonuç yok gibi davranılır, bilgi sızdırılmaz.
- Revizyon yazımı ve kart güncellemesi tek transaction'dır; kart ile günlük tutarsız kalamaz.

## 5. Test stratejisi
- `freshness`: tür başına sınır günleri (sınırda/sınır ötesi), süresiz olgular, `supersededAt` yok sayma.
- `findProjects`: Ocak/15 Ekim/geçen ay çözümü (sabit `now` ile, Europe/Istanbul), çoklu eşleşme listesi, sıfır eşleşme, sahiplik filtresi.
- `summarizeProject`: sıralama (en yeni → en eski), sayıların yalnız kayıttan gelmesi, sonda sabit soru.
- `claim`: tek kullanım, süre dolumu, hash saklama, telefon çakışması, `userId` toplu doldurma.
- Revizyon + kart transaction atomikliği; parsel tevhid (çoklu parsel).
- `extractFromImage`: fixture görsel çıktıları (parsel sorgu / tapu / imar / mesaj ekranı) ile şema ve TC'nin çıktıda olmaması; düşük güven davranışı.
- Webhook entegrasyonu: `image` türü, medya indirme hatası, bütçe aşımı.
- Regresyon: web/voice araç setine hiçbir yeni araç sızmaz (Akif-5'teki `WA_AKIF_TOOL_DEFS` deseni).

## 6. Geriye dönük uyumluluk
Additive: yeni modeller ve yeni WhatsApp-özel araçlar. Paylaşılan `toolRegistry.ts`, web `Project`/`Scenario` ve Akif-3 `akifMemory` değişmez. Migration yalnız yeni tabloları ekler.

## 7. Deploy kapısı
- Yeni env: görsel okuma için vision model adı/limitleri, claim bağlantısı tabanı (varsayılan `https://www.arsabil.com`), bayatlık ömürleri (opsiyonel override).
- Meta tarafında medya indirme izni/erişim belirteci doğrulanır.
- İnsan duman testi (gerçek numara + gerçek Meta webhook): metinle proje açma, revizyon ekleme, 5 gün sonra özet/"değiştirelim mi?", bayat imar teyidi, üyelik bağlantısı → web'de görünme, ardından resim türlerinin her biri.

## 8. Teslim aşamaları
1. **Aşama B — Proje Kartı çekirdeği:** modeller, servis katmanı, `findProjects`/`summarizeProject`/`createProject`/`updateProject`/`rememberFact`, bayatlık politikası, üyelik eşleştirme (`claim`) + web bağlama sayfası ve "Akif Projelerim" görünümü.
2. **Aşama C — Hesap diyaloğu:** imar sorma akışı, konut ilanı taraması + bölge daire fiyat istatistiği, fiyat doğrulama, motorla hesap.
3. **Aşama A — Görsel anlama:** `parseInbound` image desteği, medya indirme, `extractFromImage`, onay akışı.

Her aşama kendi implementasyon planı, testi ve teslimiyle ilerler; sırası B → C → A.

## 9. Plan-zamanı netleştirmeler (2026-10-15, Aşama B planı)

1. **Sahiplik:** §2'deki `ownerPhone` + `userId?` ikili sahipliği kaldırıldı. Kalıcı kayıt yalnız bağlı hesaba (`userId`, zorunlu) aittir (§3.4(4): üyelik olmadan kalıcı kart yoktur, dolayısıyla bağlanmamış telefonun toplu doldurulacak kaydı yoktur). Telefon yalnız `User.whatsappPhone` (benzersiz) ve `PhoneClaim`'de tutulur.
2. **Aşama B'de eklenmeyenler:** `ProjeKarti.result` (Aşama C), web `Project`'e kopyalama / `projectId` (web'de "Akif Projelerim" görünümü bu ihtiyacı karşılar).
3. **Üyelik öncesi kaydet:** `createProject` argümanları `PhoneClaim.draft`'a yazılır; bağlantı tüketilince kart otomatik oluşur (konuşma durumu 30 dk TTL'li olduğu için sohbet geçmişine güvenilemez).
4. **Tek araç/tur:** orchestrator tur başına tek araç çağırır; `findProjects` tek eşleşmede özeti de döner (ayrı `summarizeProject` turu gerekmesin), `createProject` olguları parsel başına `facts` ile alır.
