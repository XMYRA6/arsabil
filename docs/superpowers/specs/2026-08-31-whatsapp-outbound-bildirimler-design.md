# Alt-proje 5b — WhatsApp Outbound Bildirimler (tasarım)

**Tarih:** 2026-08-31
**Branch:** `codex/professional-ui-and-land-cost` (5a merge'li, HEAD `9e86132`)
**Üst bağlam:** [[project_arsabil_edermi_rakip]] — rakip edermi.com'un WhatsApp botu
bir dağıtım kanalı. ArsaBil "Alt-proje 5" kararı: A (parsel sorgu botu) + C
(bildirim/outreach). 5 ikiye bölündü:

- **5a (TAMAM + MERGE'Lİ):** Inbound sorgu botu — `docs/superpowers/specs/2026-08-31-whatsapp-inbound-sorgu-botu-design.md`.
- **5b (bu spec):** Outbound bildirimler — abonelik modeli + aylık özet +
  muhafazalı eşik uyarısı + Meta mesaj şablonları + projenin İLK zamanlanmış işi.

Akif (LLM danışman) alt-proje 4, en son.

---

## 1. Amaç ve kapsam

**Amaç:** WhatsApp'tan parsel sorgusu yapan kullanıcı, sorduğu mahalleyi "takip"
edebilsin; sonra bota hiç yazmadan ayda bir fiyat özeti + arada anlamlı fiyat
hareketi olursa uyarı alsın. Müteahhit/yatırımcı için "unutulmama" + "fırsat
yakalama" değeri.

**Onaylanan kararlar (2026-08-31 brainstorming):**
- **Opt-in:** kart gönderildikten sonra bot sorar ("Evet yaz"), cevap konuşma
  state'inde yakalanır. İnteraktif buton YOK (v1).
- **Zamanlanmış iş:** Coolify Scheduled Task → `npm run notify:run`, **haftalık**.
  Yeni servis yok, açık endpoint yok.
- **Aylık özet:** ayın sabit günü (env `NOTIFY_DIGEST_DAY`, varsayılan 1), tek
  parti, ay-bazlı idempotent.
- **Opt-out:** `DURDUR` anahtar kelimesi → o telefonun TÜM abonelikleri silinir.
  Her bildirim mesajının altında "Durdurmak için DURDUR yaz".

### Kapsam DIŞI (5b)

- İnteraktif buton opt-in; mahalle-bazlı opt-out ("DURDUR <mahalle>")
- AI fiyat öngörüsü; Akif / LLM (alt-proje 4)
- SMS / e-posta kanalı
- İşletme-başlatmalı pazarlama mesajları (yalnız UTILITY şablonlar)
- Abonelik yönetimi için web arayüzü

---

## 2. Veri modeli

### 2.1 Yeni Prisma modeli

```prisma
model WhatsappSubscription {
  id                 String   @id @default(cuid())
  phone              String
  il                 String   // normalizeAreaName'li — aggregation key-space ile aynı
  ilce               String   // normalizeAreaName'li
  mahalle            String   // normalizeAreaName'li
  createdAt          DateTime @default(now())
  lastDigestMonth    String?  // "YYYY-MM" — bu takvim ayında özet gönderildi mi
  lastAlertAt        DateTime?
  lastAlertDirection String?  // "up" | "down"

  @@unique([phone, il, ilce, mahalle])
  @@index([il, ilce, mahalle])
}
```

- Alan adları `normalizeAreaName` (trim + İ→I + ı→i + toUpperCase) ile
  saklanır — `AreaPriceStat` / `AreaPriceTrend` / `MarketListing` yazma yoluyla
  aynı key-space (bkz. 5a `resolveLocation` çözülmüş TKGM adları da normalize
  edilerek yazılır).
- `phone`: 5a `parseInbound`'un normalize ettiği biçim (sadece rakam, baştaki
  `+` yok).

### 2.2 Migration

Elle yazılmış SQL: `prisma/migrations/20260901120000_add_whatsapp_subscription/migration.sql`
(proje deseni). Dev DB'ye `prisma migrate deploy` + `prisma generate`.
**Prod'a:** batch deploy anında, diğer bekleyen migration'larla
(`WhatsappConversation`, `Neighborhood`, `AreaPriceStat`, `AreaPriceTrend`).

---

## 3. Opt-in / opt-out akışı (5a `handleMessage` genişletmesi)

### 3.1 `ConvState` genişletmesi

`src/lib/whatsapp/types.ts` — `ConvState`'e opsiyonel alan:

```ts
awaitingFollowup?: { il: string; ilce: string; mahalle: string }  // çözülmüş TKGM adları
```

### 3.2 DURDUR — `handleMessage`'de rate-limit + idempotency'den SONRA, non-text/empty guard'larından ÖNCE

(5a F5d ile idempotency zaten rate-limit'ten önce; DURDUR ikisinden de sonra —
normal trafik gibi 10/dk limitine tabi, tek `messageId` retry'de tekrar
işlenmez.)

Gelen `text` (trimmed, `toLocaleLowerCase('tr')`) `durdur` / `stop` /
`aboneliği iptal` / `abonelikten çık` ise:
- `deps.deleteSubscriptions(msg.from)` → o telefonun tüm `WhatsappSubscription`
  satırları silinir.
- Silinen sayı > 0 → `sendText(from, "Tüm fiyat takip aboneliklerin durduruldu. İstediğin an yeni bir parsel sorarak tekrar takip başlatabilirsin.")`
- Silinen sayı = 0 → `sendText(from, "Zaten aktif bir fiyat takip aboneliğin yok.")`
- State'i **değiştirme** (DURDUR konuşma akışını bozmaz), `lastMessageId`
  güncelle, dur.

Not: 5a'nın konuşma-reset anahtarları (`iptal`/`baştan`/`yeni`/`vazgeç`) DURDUR
ile ÇAKIŞMAZ — DURDUR ayrı bir kelime ve önce kontrol edilir. `iptal` tek
başına hâlâ yalnız aktif disambiguasyonu iptal eder.

### 3.3 Opt-in sorusu — kart başarıyla gönderildikten sonra (5a Akış adım 11 `resolved` + `res.ok` dalı)

- 5a `renderCard`'ın son satırındaki placeholder (`"Yakında: ..."`) KALDIRILIR.
- Kart mesajı gönderildikten sonra `handleMessage` İKİNCİ bir mesaj gönderir:
  `renderFollowupPrompt()` →
  *"📩 Bu mahalledeki fiyat değişimlerini takip edeyim mi? **Evet** yaz — ayda bir fiyat özeti, arada sert bir hareket olursa uyarı göndereyim."*
- `state.awaitingFollowup = { il: fields.ilText, ilce: fields.ilceText, mahalle: fields.mahalleText }` (hepsi çözülmüş), adım 12 save.
- **Zaten abone ise** (`deps.hasSubscription(from, il, ilce, mahalle)` true) →
  follow-up sorusu HİÇ gönderilmez, `awaitingFollowup` set edilmez (kart tek
  başına gider).

### 3.4 Follow-up cevabı — `handleMessage` yeni adım (adım 5'ten sonra, adım 6'dan önce)

`state.awaitingFollowup` set ise:
- `text` (trimmed, tr-lowercase) ∈ {`evet`, `e`, `olur`, `tamam`, `takip et`,
  `takip`} → `deps.upsertSubscription(from, awaitingFollowup)` +
  `sendText(from, "✅ {mahalle} Mah. takibe alındı. Durdurmak için istediğin an DURDUR yaz.")`;
  `awaitingFollowup` temizle, save, dur.
- Başka herhangi bir şey → `awaitingFollowup` temizle (save ETME burada),
  mesajı **normal akışta işlemeye devam et** (adım 6+) — kullanıcı "hayır" veya
  yeni bir sorgu yazmış olabilir, ikisi de doğru sonuçlanır.

### 3.5 `HandleDeps` genişletmesi

```ts
hasSubscription: (phone: string, il: string, ilce: string, mahalle: string) => Promise<boolean>
upsertSubscription: (phone: string, area: { il: string; ilce: string; mahalle: string }) => Promise<void>
deleteSubscriptions: (phone: string) => Promise<number>
```

Gerçek çağrı sitesi (`route.ts buildHandleDeps`) bunları `prisma.whatsappSubscription`
üzerinden bağlar. Alan adları upsert/query öncesi `normalizeAreaName`'den geçer.

---

## 4. Bildirim motoru

### 4.1 Script: `scripts/whatsapp-notify.ts` → `npm run notify:run`

`ts-node` ile, `prices:aggregate` / `prices:trend` script'leriyle aynı desen
(`--compiler-options "{\"module\":\"commonjs\"}"`).

Her koşu:
1. **Veri tazeleme:** mevcut `aggregateAreaPrices` + trend aggregation saf
   fonksiyonlarını çağırır (script'ler zaten saf çekirdeği `scripts/` içinde
   tutuyor — ortak fonksiyon `src/lib/areaPrices/` altında; import edilir).
   Sonuç `AreaPriceStat` / `AreaPriceTrend`'e yazılır. Böylece eşik
   karşılaştırması taze veriye dayanır.
2. `runNotify(deps)` çağrılır (aşağıda §4.3).

### 4.2 Saf modüller — `src/lib/whatsapp/notify/`

| Modül | İmza | Sorumluluk |
|---|---|---|
| `digestDue.ts` | `digestDue(sub: SubLike, now: Date, digestDay: number): boolean` | bugünün günü ≥ `digestDay` VE `sub.lastDigestMonth ≠ ymKey(now)` |
| `thresholdAlert.ts` | `thresholdAlert(rows: TrendRow[], sub: SubLike, now: Date, opts: { minSample: number; pct: number }): AlertResult` | saf; `{ fire: boolean; direction?: 'up'\|'down'; current?: number; baseline?: number; pctChange?: number }` |
| `resolveAreaTrend.ts` | `resolveAreaTrend(rows: TrendRow[], sub: SubLike): { basis: 'mahalle'\|'ilce'\|'il'; buckets: TrendBucket[] } \| null` | mahalle→ilçe→il fallback (card.ts `priceTrend` deseniyle aynı eşikler: mahalle ≥ 3 kova) |
| `formatPctChange.ts` | `formatPctChange(from: number, to: number): string` | `"%4,2 artış"` / `"%1,1 düşüş"` / `"değişim yok"` (< %0,5) |
| `runNotify.ts` | `runNotify(deps: NotifyDeps): Promise<NotifySummary>` | orkestrasyon |

**`thresholdAlert` mantığı:**
- `resolveAreaTrend` ile kovalar alınır. `current` = bu ay kovası
  (`ymKey(now)`) medyan ₺/m². `baseline` = önceki **3 takvim ayı** kovalarının
  `medianPricePerSqm` ortalaması (mevcut kovalar; < 3 kova varsa `fire: false`).
- Her iki tarafta `sampleCount ≥ opts.minSample` (current kovası + baseline'a
  giren her kova) — değilse `fire: false`.
- `pctChange = (current - baseline) / baseline`. `|pctChange| < opts.pct` →
  `fire: false`.
- `direction` = `pctChange > 0 ? 'up' : 'down'`.
- Dedup: `runNotify` katmanında — `sub.lastAlertAt` null VEYA `> 30 gün` önce
  VEYA `sub.lastAlertDirection ≠ direction` ise gönder; aksi halde bastır.

### 4.3 `runNotify` akışı

Girdi DI: `{ listSubscriptions, findTrendRows, sendDigestTemplate,
sendAlertTemplate, markDigestSent, markAlertSent, now, config }`.

```
config = { digestDay: env NOTIFY_DIGEST_DAY ?? 1,
           minSample: env NOTIFY_MIN_SAMPLE ?? 5,
           alertPct: env NOTIFY_ALERT_PCT ?? 0.10,
           siteBase: 'https://www.arsabil.com' }
```

1. `subs = await listSubscriptions()` (tüm satırlar).
2. Her `sub` için:
   a. `rows = await findTrendRows(sub.il, sub.ilce, sub.mahalle)` — son 12 ay
      `AreaPriceTrend` (il/ilçe/mahalle 3-yönlü OR, card.ts route deseni).
   b. **Aylık özet:** `digestDue(sub, now, config.digestDay)` ise:
      - `resolveAreaTrend(rows, sub)` → son 2 dolu kova. Yoksa/1 kova → atla
        (özet gönderme, sessiz).
      - `sendDigestTemplate(sub.phone, { mahalle: sub.mahalle, current, pctText, href })`
      - `await markDigestSent(sub.id, ymKey(now))` → `lastDigestMonth`.
      - 200ms bekle.
   c. **Eşik uyarısı:** `thresholdAlert(rows, sub, now, config)` → `fire` ise
      dedup kontrolü geçerse:
      - `sendAlertTemplate(sub.phone, { mahalle, pctText, baseline, current, href })`
      - `await markAlertSent(sub.id, now, direction)`.
      - 200ms bekle.
3. `NotifySummary` döner (kaç özet, kaç uyarı, kaç atlandı, hatalar) — script
   stdout'a yazar.

**Hata izolasyonu:** bir abonenin gönderimi `throw` ederse `catch` + logla +
sonraki aboneye geç (tek abone tüm turu düşürmez). `sendDigestTemplate` /
`sendAlertTemplate` kendileri zaten `sendMessage.ts` gibi throw etmez.

### 4.4 `sendTemplate.ts` — `src/lib/whatsapp/`

`createSendText`'in kardeşi. Graph API `POST /{phoneNumberId}/messages`:

```json
{
  "messaging_product": "whatsapp",
  "to": "<phone>",
  "type": "template",
  "template": {
    "name": "<template_name>",
    "language": { "code": "tr" },
    "components": [{ "type": "body", "parameters": [{ "type": "text", "text": "<v1>" }, ...] }]
  }
}
```

`createSendTemplate(deps: { fetch, config }): (to: string, template: string, params: string[]) => Promise<void>` —
`!res.ok` → `console.error` (telefon maskeli, ham gövde YOK — 5a F4 kararıyla
tutarlı: yalnız status + `error.code`/`type`/`message`), throw ETMEZ.

İki ince sarmalayıcı:
- `sendDigestTemplate(to, { mahalle, current, pctText, href }) → createSendTemplate(to, 'arsabil_aylik_ozet', [mahalle, formatTl(current)+' ₺/m²', pctText, href])`
- `sendAlertTemplate(to, { mahalle, pctText, baseline, current, href }) → createSendTemplate(to, 'arsabil_fiyat_uyarisi', [mahalle, pctText, formatTl(baseline)+' ₺/m²', formatTl(current)+' ₺/m²', href])`

`href` = `${siteBase}/deger` (parsel bilinmiyor — abonelik mahalle bazlı).

---

## 5. Meta mesaj şablonları

Kategori **UTILITY**, dil `tr`. Meta onayı 24-48 saat — **deploy'dan ÖNCE
kullanıcı oluşturup onaya gönderir.**

### `arsabil_aylik_ozet`
```
{{1}} için aylık fiyat özeti 📊
Ortalama: {{2}} (geçen aya göre {{3}})
Detaylı analiz: {{4}}

Durdurmak için DURDUR yaz.
```
`{{1}}` mahalle adı · `{{2}}` "4.900 ₺/m²" · `{{3}}` "%4,2 artış" / "%1,1 düşüş" /
"değişim yok" · `{{4}}` `https://www.arsabil.com/deger`

### `arsabil_fiyat_uyarisi`
```
{{1}} bölgesinde dikkat çekici fiyat hareketi ⚠️
Son 3 ayın ortalamasına göre {{2}} ({{3}} → {{4}})
{{5}}

Durdurmak için DURDUR yaz.
```
`{{1}}` mahalle · `{{2}}` "%12 artış" / "%15 düşüş" · `{{3}}` baseline "4.200 ₺/m²" ·
`{{4}}` güncel "4.900 ₺/m²" · `{{5}}` link

---

## 6. Test stratejisi

Jest + saf modül + DI. Fixture'lar `src/lib/whatsapp/notify/__fixtures__/`.

| Modül | Test |
|---|---|
| `digestDue` | gün < / = / > `digestDay`; `lastDigestMonth` bu ay (bastır) / geçen ay (gönder) / null (gönder) |
| `thresholdAlert` | eşik altı (%8) → no fire; eşik üstü (%12) ilk kez → fire up; baseline < 3 kova → no fire; current kova `sampleCount` < minSample → no fire; baseline kovalarından biri < minSample → no fire; düşüş (%−15) → fire down |
| `resolveAreaTrend` | mahalle ≥ 3 kova → mahalle basis; mahalle 1 kova → ilçe fallback; hiçbiri → null |
| `formatPctChange` | +%4,23 → "%4,2 artış"; −%1,08 → "%1,1 düşüş"; +%0,3 → "değişim yok" |
| `runNotify` | tüm deps sahte: (a) 1 abone digest günü + eşik → 2 şablon çağrısı + 2 mark; (b) idempotent ikinci koşu (lastDigestMonth bu ay, lastAlertDirection aynı) → 0 çağrı; (c) 1 abonenin `sendDigestTemplate` throw'u sonraki aboneyi düşürmez; (d) yetersiz veri → digest atlanır, uyarı atlanır |
| `sendTemplate` | Graph API `type:'template'` gövde şekli (name/language/components/parameters); `!res.ok` → console.error (status + code, ham gövde YOK, telefon maskeli), throw YOK |
| `handleMessage` (5a genişletme) | DURDUR → `deleteSubscriptions` çağrılır + onay, state korunur; DURDUR ama abonelik yok → "zaten abone değilsin"; opt-in "Evet" (awaitingFollowup set) → `upsertSubscription` + onay + flag temizlenir; opt-in "yok bırak" → flag temizlenir, mesaj normal işlenir; zaten abone → follow-up sorusu gönderilmez |

Her task: `tsc --noEmit` temiz + `npm run build` temiz (route/page değişikliği
varsa) + tüm jest yeşil (`src/` kökü).

---

## 7. Deploy notu

Bu iş `codex/professional-ui-and-land-cost`'ta birikir. Hafızadaki plan:
5b/6b/6c + Akif hepsi lokal bitince **tek seferde** `main` merge + push +
Coolify deploy + tüm bekleyen migration'lar + WhatsApp Meta kurulumu.

**Kullanıcının ön koşulları (kod değil):**
1. Meta'da `arsabil_aylik_ozet` + `arsabil_fiyat_uyarisi` şablonlarını oluştur,
   onaya gönder (24-48s — deploy'dan önce başlat).
2. Coolify Scheduled Task: komut `npm run notify:run`, cron `0 9 * * 1`
   (Pazartesi 09:00) veya tercih, çalışacağı servis = app.
3. Env (hepsi opsiyonel, varsayılanları var): `NOTIFY_DIGEST_DAY=1`,
   `NOTIFY_MIN_SAMPLE=5`, `NOTIFY_ALERT_PCT=0.10`.

**İlk deploy sonrası:** `WhatsappSubscription` + diğer migration'lar
`prisma migrate deploy` ile prod'a; ilk `notify:run` elle tetiklenip çıktısı
kontrol edilmeli (kaç abone, kaç gönderim, hata var mı).

---

## 8. Açık noktalar / v1 kalıntıları

- Şablon `{{2}}` "4.900 ₺/m²" gibi birim içeren tek parametre — Meta bazı
  şablon parametrelerinde `₺`/newline kısıtı koyabilir; onay reddedilirse
  wording sadeleştirilir (implementasyonda parametre yapısı sabit kalır).
- `notify:run` her koşuda tüm `prices:aggregate`/`trend`'i yeniden hesaplar —
  Trabzon-pilot veride ucuz; ulusal veride ağırlaşırsa ayrı bir "sadece bayat
  mahalleler" artımlı hesaplamaya geçilir (5b sonrası).
- Eşzamanlılık: tek Coolify task instance varsayımı — `notify:run` paralel
  koşmaz. Coolify aynı task'ı üst üste tetiklemez (varsayılan).
- `siteBase` linki parsel taşımıyor (`/deger` ana sayfası) — abonelik mahalle
  bazlı, spesifik parsel yok. İleride "mahalle özet sayfası" (6b) linki buraya
  girebilir.
- 5a'nın `awaitingFollowup` cevabı "hayır"sa kullanıcıya açık bir "tamam"
  denmez (mesaj sessizce normal akışa düşer) — bilinçli, ekstra mesaj gürültüsü
  olmasın diye.
