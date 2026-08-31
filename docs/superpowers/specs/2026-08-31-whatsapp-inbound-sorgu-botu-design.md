# Alt-proje 5a — WhatsApp Inbound Sorgu Botu (tasarım)

**Tarih:** 2026-08-31
**Branch:** `codex/professional-ui-and-land-cost`
**Üst bağlam:** [[project_arsabil_edermi_rakip]] — rakip edermi.com'un dağıtım
kanallarından biri WhatsApp botu. ArsaBil'in "Alt-proje 5" kararı: A (parsel
sorgu botu) + C (bildirim/outreach) birlikte, sonra Akif entegrasyonu. Alt-proje
5 ikiye bölündü:

- **5a (bu spec):** Inbound sorgu botu — WhatsApp Cloud API plumbing + serbest
  metinden parsel sorgusu + ücretsiz Değer Kartı özeti cevabı + konuşma state'i.
- **5b (ayrı spec, sonra):** Outbound bildirimler — abonelik modeli + aylık özet
  + muhafazalı eşik uyarısı + Meta mesaj şablonları + zamanlanmış iş.

Akif (LLM'li doğal dil danışman) alt-proje 4, en son. 5a, Akif'in takılacağı
`QueryUnderstanding` dikişini şimdiden açar.

---

## 1. Amaç ve kapsam

**Amaç:** Kullanıcı WhatsApp'tan bir arsanın konumunu ve ada/parsel numarasını
serbest metinle yazınca, bot bunu TKGM idari yapısına oturtup mevcut anonim
Değer Kartı motorunu çalıştırır ve sonucu kısa bir WhatsApp mesajı olarak döner,
tam kart için siteye yönlendirir.

**Sağlayıcı kararı:** Meta WhatsApp Cloud API (doğrudan). Aracı BSP yok. 5a'nın
tüm cevapları kullanıcı-başlatmalı mesajın 24 saatlik servis penceresi içinde
kalır → **Meta mesaj şablonu gerekmez**.

**Sorgu akışı kararı:** Hibrit — kullanıcı serbest yazar, bot içindekini çıkarır,
yalnızca eksik olan tek alanı sorar.

**Konum çözümleme kararı:** Serbest çıkarım + kademeli fuzzy eşleştirme
(il → ilçe → mahalle), belirsizlikte hedefli soru. LLM yok, Levenshtein yok
(v1) — belirsizlikte sormak yanlış-eşleşmeden güvenli.

### Kapsam DIŞI (5a)

- Abonelik modeli, aylık özet, eşik uyarısı, Meta mesaj şablonları, zamanlanmış
  iş → **5b**
- Akif / LLM / niyet çıkarımının yapay zekâ implementasyonu
- Görsel, konum, sesli mesaj işleme (kısa "sadece yazı" cevabı verilir)
- Telefon numarası ↔ ArsaBil kullanıcı hesabı eşleştirme
- Mahalle sınırı / mini harita görseli mesaja ekleme
- Çıkışlı (business-initiated) mesaj gönderme

---

## 2. Mimari

### 2.1 Route

`src/app/api/whatsapp/webhook/route.ts`

**`GET`** — Meta doğrulama el sıkışması:
- Query: `hub.mode`, `hub.verify_token`, `hub.challenge`
- `hub.mode === 'subscribe'` ve `hub.verify_token === env.WHATSAPP_VERIFY_TOKEN`
  ise `hub.challenge`'ı **plain text** olarak 200 döner; aksi halde 403.

**`POST`** — gelen olay:
1. Ham gövdeyi oku (imza doğrulaması ham bytes ister).
2. `X-Hub-Signature-256` header'ını `verifySignature(rawBody, appSecret)` ile
   doğrula. Geçersiz → 403, gövde işlenmez.
3. `parseInbound(json)` → 0..N normalize mesaj. (Meta bir webhook'ta birden çok
   `entry`/`change`/`message` gönderebilir; status callback'leri de aynı
   endpoint'e gelir — bunlar `parseInbound`'da elenir.)
4. Her mesaj için `handleMessage(...)` çağır. **Meta 10 sn içinde 200 bekler** →
   `handleMessage` çağrıları `after()` (Next.js `next/server`) ile response
   döndükten sonra çalışır; route her zaman hemen `200` döner (imza geçerliyse).
   `after()` içindeki hata yalnızca loglanır — Meta'ya 500 dönmek gereksiz retry
   fırtınası yaratır.

**Rate limit route seviyesinde değil** `handleMessage` içinde (telefon başına,
IP değil — tüm istekler Meta'nın IP'lerinden gelir).

### 2.2 Saf modüller — `src/lib/whatsapp/`

| Modül | Sorumluluk | Bağımlılık |
|---|---|---|
| `verifySignature.ts` | `verifySignature(rawBody: string, secret: string, header: string \| null): boolean` — HMAC-SHA256, sabit-zaman karşılaştırma (`crypto.timingSafeEqual`) | node:crypto |
| `parseInbound.ts` | Meta webhook JSON → `InboundMessage[]` (`{ from, text, messageId, timestamp, type }`); non-text ve status callback'ler `type` ile işaretlenir | – (saf) |
| `extractParcelQuery.ts` | `extractParcelQuery(text: string): ParsedQuery` — regex/heuristik: `{ ilText?, ilceText?, mahalleText?, ada?, parsel? }` | – (saf) |
| `resolveLocation.ts` | `resolveLocation(parsed, deps): Promise<ResolveResult>` — kademeli fuzzy eşleştirme; `{ kind:'resolved', mahalleId, il, ilce, mahalle }` \| `{ kind:'ambiguous', level, candidates }` \| `{ kind:'notfound', level, term }` | TKGM idariYapi fonksiyonları (DI) |
| `matchAreaName.ts` | `resolveLocation`'ın saf yardımcısı: `matchAreaName(input: string, options: {id,text}[]): {id,text}[]` — `normalizeAreaName` ile katla; tam eşitlik → `startsWith` → ek-atılmış (`MAH.`/`MAHALLESI`/boşluksuz); sonuç 0/1/N aday | `normalizeAreaName` |
| `renderCard.ts` | `renderCard(dto: DegerCardDTO, siteUrl: string): string` — WhatsApp metni | – (saf) |
| `renderError.ts` | Hata/yardım/belirsizlik mesajı metinleri (Türkçe sabitler + küçük şablonlar) | – (saf) |
| `conversation.ts` | `loadConversation`, `saveConversation`, `mergeFields` (saf) — state oku/yaz/birleştir, TTL | Prisma (DI) |
| `handleMessage.ts` | Orkestrasyon (aşağıda §4) | yukarıdakiler, hepsi DI |
| `sendMessage.ts` | `sendWhatsappText(to: string, body: string, deps): Promise<void>` — Meta Graph `POST /{phoneNumberId}/messages` sarmalayıcısı; `fetch` DI | env config |

### 2.3 Akif dikişi

`handleMessage`, "kullanıcı metnini yapılandırılmış parsel sorgusuna çevirme"
adımını `QueryUnderstanding` arayüzü üzerinden çağırır:

```ts
interface QueryUnderstanding {
  understand(text: string, prior: ConvFields): Promise<ParsedQuery>
}
```

v1 implementasyonu `RuleBasedUnderstanding` — içi `extractParcelQuery` + merge.
Akif geldiğinde `LlmUnderstanding` aynı arayüzü sağlar; `handleMessage` değişmez.

---

## 3. Veri modeli

### 3.1 Prisma modeli

```prisma
model WhatsappConversation {
  id            String   @id @default(cuid())
  phone         String   @unique   // Meta wa_id / E.164 (baştaki + olmadan Meta ne verirse)
  state         Json                // ConvState (aşağıda)
  lastMessageId String?             // idempotency — işlenen son Meta message id
  updatedAt     DateTime @updatedAt
  createdAt     DateTime @default(now())
}
```

`ConvState` (uygulama tipi, DB'de `Json`):

```ts
type ConvLevel = 'il' | 'ilce' | 'mahalle' | 'ada' | 'parsel'

interface ConvFields {
  ilText?: string;   ilId?: number
  ilceText?: string; ilceId?: number
  mahalleText?: string; mahalleId?: number
  ada?: string; parsel?: string
}

interface ConvState {
  pending?: ConvLevel                 // hangi alanın cevabı bekleniyor
  candidates?: { id: number; text: string }[]  // belirsizlik seçimi bekleniyorsa adaylar
  candidateLevel?: 'il' | 'ilce' | 'mahalle'
  fields: ConvFields
}
```

### 3.2 TTL ve idempotency

- **TTL:** `conversation.ts` `loadConversation`'da — `updatedAt` şu andan
  30 dk'dan eskiyse `null` döner (state yeni konuşma gibi başlar). Satır
  silinmez; `saveConversation` `upsert` ile üzerine yazar. Ayrı temizlik cron'u
  yok — `phone @unique` olduğu için tablo kullanıcı sayısıyla sınırlı.
- **Idempotency:** `handleMessage` başında, gelen `messageId === conv.lastMessageId`
  ise hiçbir şey yapmadan döner (Meta retry'si).

### 3.3 Migration

Elle yazılmış SQL: `prisma/migrations/20260901090000_add_whatsapp_conversation/migration.sql`
(proje deseni — hepsi elle SQL). Dev DB'ye `prisma migrate deploy` ile uygulanır.
**Prod'a:** diğer bekleyen migration'larla (`Neighborhood`, `AreaPriceStat`,
`AreaPriceTrend`) birlikte, tek seferlik deploy anında.

---

## 4. `handleMessage` akışı

Girdi: `{ from, text, messageId, type }`, DI: `{ conversation, understanding,
resolveLocationDeps, buildCard, sendText, siteUrlFor, rateLimit, now }`.

1. **Rate limit:** `checkRateLimit('wa:' + from, RATE_LIMITS.WHATSAPP_INBOUND)`.
   Aşılırsa `sendText(from, renderError.rateLimited())` ve dur.
2. **State yükle:** `conv = await conversation.loadConversation(from)` (TTL dahil).
3. **Idempotency:** `conv?.lastMessageId === messageId` → dur.
4. **Mesaj tipi:** `type !== 'text'` → `sendText(from, renderError.textOnly())`,
   state'i **değiştirme**, dur.
5. **Belirsizlik cevabı bekleniyorsa** (`conv.state.candidates`): kullanıcı
   metnini adaylarla eşleştir (sayı "1/2" veya isim). Eşleşirse ilgili
   `*Id`/`*Text` alanını doldur, `candidates` temizle, akışa 7'den devam.
   Eşleşmezse adayları tekrar sun, dur.
6. **Anla:** `parsed = await understanding.understand(text, conv?.state.fields ?? {})`.
7. **Birleştir:** `fields = mergeFields(conv?.state.fields ?? {}, parsed)`
   (yeni gelen boş-olmayan alanlar öncekini ezer).
8. **Eksik alan var mı?** Sıra: `il → ilce → mahalle → ada → parsel`. İlk eksik
   olan `L` için `sendText(from, renderError.askFor(L, fields))`,
   `state = { pending: L, fields }` kaydet (messageId ile), dur.
9. **Konum çöz:** `resolveLocation(fields, deps)`:
   - `ambiguous` → `sendText(from, renderError.chooseFrom(level, candidates))`,
     `state = { candidates, candidateLevel: level, fields }` kaydet, dur.
   - `notfound` → `sendText(from, renderError.notFound(level, term))`,
     o seviyeyi ve altını `fields`'tan temizle, `state = { pending: level, fields }`
     kaydet, dur.
   - `resolved` → `fields.mahalleId` (+ `il/ilce/mahalle` isimleri) doldur.
10. **Kart:** `result = await buildCard({ kind:'adaParsel', mahalleId, ada, parsel })`
    (mevcut `buildDegerCard`, `memberView: false`).
    - `!result.ok` → `sendText(from, renderError.forCardFailure(result.reason))`;
      `parcel_not_found` ise ada/parsel'i temizle + `pending: 'ada'`; diğer
      hallerde state'i koru, dur.
    - `result.ok` → `sendText(from, renderCard(result.card, siteUrlFor(fields)))`.
11. **State:** başarıdan sonra `state = { fields }` (pending/candidates yok) kaydet
    — kullanıcı hemen yeni bir ada/parsel yazarsa aynı mahalle hatırlanır.

---

## 5. Metin çıktıları

### 5.1 Kart (`renderCard`)

Anonim DTO alanları: `parcel` (il/ilce/mahalle/ada/parsel, areaSqm),
`value` (`freeRangeLow`, `freeRangeHigh`, `pricePerSqmCoarse`, `basis`,
`thinData`, `insufficientData`), `risk` (`faultDistanceM`, `floodQ100`,
`status`), `comparables.count`.

**Tam veri hali:**

```
*{mahalle} Mah., {ilce} / {il}*
Ada/Parsel: {ada}/{parsel} · {areaSqm} m²

💰 Tahmini değer: *{freeRangeLow} – {freeRangeHigh} ₺*
📍 ~{pricePerSqmCoarse} ₺/m² ({basis} geneli)
⚠️ Deprem: diri faya ~{faultDistanceM→km} · Taşkın (Q100): {floodQ100 ? 'risk var' : 'risk yok'}
📊 Yakın emsal ilan: {comparables.count}

Detaylı kart, net değer tahmini ve kat karşılığı fizibilitesi için:
{siteUrl}

Yakında: bu mahalledeki fiyat değişimlerini WhatsApp'tan takip edebileceksin.
```

- Sayı biçimi: `renderCard` ile aynı klasörde küçük saf yardımcı
  (`formatTl.ts`) — `toLocaleString('tr-TR')` tabanlı, milyon kısaltması
  (`2,1M`) dahil. `src/app/hesapla/` altındaki formatter'a bağımlılık
  KURULMAZ (lib → app ters bağımlılık olmasın); mantık küçük, kopyalanır.
- `insufficientData` → 💰 ve 📍 satırları yerine:
  *"Bu bölgede yeterli ilan verisi yok — risk ve parsel bilgisi yine de aşağıda."*
- `thinData` (veri var ama az) → 💰 satırına sonek: *"(sınırlı veri)"*.
- `risk.status === 'unavailable'` → ⚠️ satırını atla.
- `faultDistanceM === null` → "diri fay verisi yok"; `floodQ100 === null` →
  taşkın kısmını atla.

**Site URL:** `siteUrlFor(fields)` →
`https://www.arsabil.com/deger?il={il}&ilce={ilce}&mahalle={mahalle}&ada={ada}&parsel={parsel}`
(`/deger` sayfası bu query paramlarını okuyabiliyor mu — implementasyonda
doğrulanacak; okumuyorsa sade `https://www.arsabil.com/deger` link'i + follow-up
notu). URL bileşenleri `encodeURIComponent`.

### 5.2 Hata / yardım / soru metinleri (`renderError`)

| Fonksiyon | Metin |
|---|---|
| `help()` | "Merhaba! Bir arsanın değerini öğrenmek için konumu ve ada/parsel numarasını yaz. Örnek: `Trabzon Ortahisar Uğurlu 123/45`" |
| `textOnly()` | "Şimdilik sadece yazılı mesaj anlayabiliyorum. " + `help()` |
| `askFor('il')` | "Hangi ildeki arsa?" |
| `askFor('ilce')` | "{il} içinde hangi ilçe?" |
| `askFor('mahalle')` | "{ilce} içinde hangi mahalle?" |
| `askFor('ada')` | "Ada numarası nedir?" |
| `askFor('parsel')` | "Parsel numarası nedir?" |
| `chooseFrom(level, cands)` | "Şunlardan hangisi?\n1) {c1}\n2) {c2}\n…  (numara veya isim yaz)" |
| `notFound('ilce', term)` | "{il}'de '{term}' diye bir ilçe bulamadım. Tekrar yazar mısın?" (level'e göre) |
| `rateLimited()` | "Çok fazla sorgu geldi, 1 dakika sonra tekrar dener misin?" |
| `forCardFailure('parcel_not_found')` | "Bu ada/parsel TKGM'de bulunamadı. Numaraları kontrol edip tekrar yazar mısın?" |
| `forCardFailure('parcel_unavailable')` | "Tapu servisine şu an ulaşılamıyor, birazdan tekrar dener misin?" |

Aktif state yokken (`conv` null / `state.fields` boş) extraction tamamen boş
dönerse → `help()`.

---

## 6. `extractParcelQuery` heuristikleri

Girdi küçük harfe indirgenmez (Türkçe `İ/ı` tuzağı) — `normalizeAreaName`
eşleştirme aşamasında devreye girer. Extraction sadece **aday metin parçaları**
çıkarır, çözmez.

- **Ada/parsel:**
  - `(\d{1,7})\s*[/\-]\s*(\d{1,7})` → ada, parsel
  - `(\d{1,7})\s*ada\b` ve `(\d{1,7})\s*parsel\b` (ayrı ayrı, herhangi sırada)
  - `ada\s*[:.]?\s*(\d{1,7})`, `parsel\s*[:.]?\s*(\d{1,7})`
- **Konum:** ada/parsel token'ları metinden çıkarıldıktan sonra kalan kelimeler.
  - 1 kelime → `ilText` (state'te il yoksa) ya da `pending` neyse ona
  - 2 kelime → `ilText`, `ilceText`
  - 3+ kelime → `ilText`, `ilceText`, `mahalleText` (son kelime(ler) mahalle;
    "mah"/"mahallesi" son eki temizlenir)
  - `pending` bir seviye ise (bot o alanı sordu): tüm kalan metin o seviyenin
    text'i olarak alınır (kullanıcı sadece "Ortahisar" yazmış olabilir)
- Bu heuristik **kaba** ve bilinçli basit; belirsizliği `resolveLocation`'ın
  "ambiguous/notfound → sor" mekanizması yakalar.

---

## 7. Rate limit

`src/lib/rate-limit.ts` `RATE_LIMITS`'e eklenir:

```ts
WHATSAPP_INBOUND: { limit: 10, windowMs: 60_000 }, // telefon başına 10/dk
```

Anahtar: `wa:{from}`. Bellek-içi limiter tek-instance varsayımıyla çalışıyor
(dosyanın kendi notu) — ArsaBil tek container, sorun yok.

TKGM çağrıları (`fetchIlListesi` vb.) zaten `next: { revalidate: 86400 }` /
`revalidate: 86400` ile cache'li — bot trafiği TKGM'yi yormaz.

---

## 8. Güvenlik

- **İmza:** her `POST` `X-Hub-Signature-256` ile app secret'a karşı doğrulanır
  (`timingSafeEqual`). Başarısız → 403, gövde parse edilmez.
- **Verify token:** `GET` handshake sabit env token ile.
- **Access token:** `WHATSAPP_ACCESS_TOKEN` yalnız sunucuda; `sendMessage` dışında
  kullanılmaz. Repo'ya girmez (`.env` + Coolify secret).
- **PII:** telefon numarası `WhatsappConversation.phone`'da düz tutulur (botun
  çalışması için gerekli). Log'lara numara yazılmaz (maskelenir: son 4 hane).
- **Kötüye kullanım:** rate limit + imza doğrulaması dışında ek önlem yok (v1).

---

## 9. Test stratejisi

Jest + saf modül + DI (proje deseni). Fixture'lar `src/lib/whatsapp/__fixtures__/`.

| Modül | Test |
|---|---|
| `verifySignature` | bilinen vektör (secret+payload → beklenen imza); bozuk imza; header null |
| `parseInbound` | fixture: tek text mesaj; çoklu entry/message; `image` mesaj (type işaretli); status callback (elenmiş); eksik alanlar |
| `extractParcelQuery` | tablo: "trabzon ortahisar uğurlu 123/45", "123 ada 45 parsel trabzon", "ada: 5 parsel: 10", sadece "Ortahisar", çöp metin, boş |
| `matchAreaName` | tam eşitlik; `startsWith`; "Ortahisar" vs "ORTAHİSAR" (i/İ); "Uğurlu" vs "Uğurluoğlu" (2 aday); ek temizliği ("Uğurlu Mah.") |
| `resolveLocation` | sahte TKGM listeleri: full resolve; il çoklu aday; ilçe notfound; mahalle i/İ eşleşme |
| `renderCard` | free DTO tam; `thinData`; `insufficientData`; `risk unavailable`; `faultDistanceM null` |
| `conversation` | `mergeFields` saf birleştirme; `loadConversation` TTL sınırı (29 dk / 31 dk); `saveConversation` upsert |
| `handleMessage` | tüm bağımlılıklar sahte — (a) tam sorgu → kart; (b) eksik ilçe → soru → cevap → kart; (c) belirsiz mahalle → seçim → kart; (d) idempotent retry (aynı messageId) no-op; (e) non-text → "sadece yazı"; (f) rate limit aşıldı; (g) `parcel_not_found` → ada/parsel reset |
| `route.ts` | GET doğru token → challenge 200; GET yanlış token → 403; POST geçersiz imza → 403; POST geçerli → 200 + `handleMessage` çağrıldı (mock); `after()` hatası 500'e dönüşmez |

Her task: `tsc --noEmit` temiz + `npm run build` temiz + tüm jest yeşil
(değişiklik `src/` içinde, global paket koşulur).

---

## 10. Ön koşullar (kullanıcı — kod değil)

1. Meta Business Manager hesabı + işletme doğrulaması
2. Meta App + WhatsApp product + **kişisel WhatsApp'a bağlı olmayan** telefon
   numarası (test numarası ile başlanabilir)
3. Kalıcı system-user access token
4. Webhook Meta'ya girilir: `https://www.arsabil.com/api/whatsapp/webhook`,
   verify token = `WHATSAPP_VERIFY_TOKEN`; `messages` alanına abone olunur
5. Env değişkenleri Coolify'a: `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET`,
   `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_GRAPH_VERSION`
   (`v21.0` vb.)

5a için Meta **mesaj şablonu gerekmez** (tüm cevaplar 24 saatlik servis penceresi
içinde).

---

## 11. Deploy notu

Bu iş `codex/professional-ui-and-land-cost` branch'inde birikir. Hafızadaki
plan ([[project_arsabil_edermi_rakip]]): 5a/5b/6b/6c hepsi lokal bitince
**tek seferde** `main` merge + push + Coolify deploy + tüm bekleyen migration'lar
+ sonra ulusal crawl. WhatsApp botu ancak o deploy'dan + Meta kurulumundan
sonra canlı çalışır. 5a bitince lokal doğrulama: Meta'nın "test numarası" +
webhook'u geçici bir tünel (`cloudflared` / `ngrok`) ile denenebilir (opsiyonel,
kullanıcı tercihi).

---

## 12. Açık noktalar / v1 kalıntıları

- `/deger` sayfası `?il=&ilce=&mahalle=&ada=&parsel=` query paramlarını okuyor
  mu — implementasyonda doğrulanacak; okumuyorsa link sade `/deger`'e düşer
  (küçük follow-up: sayfaya param okuma eklemek).
- `extractParcelQuery` heuristiği kaba — "Ortahisar Merkez" gibi çok kelimeli
  ilçe/mahalle adlarında yanlış bölme olabilir; `resolveLocation`'ın notfound →
  sor mekanizması ağı. Gerçek WhatsApp trafiğiyle ayarlanacak.
- Bellek-içi rate limiter + konuşma state'i TTL'i: yatay ölçeklemede (birden çok
  container) limiter Redis'e taşınmalı; state zaten DB'de.
- Telefon numarası formatı (Meta bazen `+` ile bazen olmadan verir) —
  `parseInbound` tek biçime normalize eder (`+` at, sadece rakam).
