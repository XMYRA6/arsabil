# Alt-proje: Akif — WhatsApp Entegrasyonu (Akif-5) tasarımı

**Tarih:** 2026-09-15
**Branch:** `codex/professional-ui-and-land-cost` (HEAD `79ea260` — Akif-3 merge sonrası)
**Üst bağlam:** `docs/arsabil-ai-akif-product-vision-v1.1.md`, `docs/superpowers/specs/2026-09-15-akif-3-arsa-dosyasi-design.md` (Akif dekompozisyon tablosu). [[project_arsabil]], [[project_arsabil_edermi_rakip]] (Akif = "alt-proje 4"; 5a/5b WhatsApp bot = "alt-proje 5").

## 0. Akif dekompozisyonu — güncel

| Alt-proje | Kapsam | Durum |
|---|---|---|
| Akif-1..3 | Metin/Ses/Aksiyon/Hafıza (yalnız `/akif` web sayfası üzerinden erişilir) | **BİTTİ** |
| **Akif-5 (bu spec)** | **WhatsApp inbound entegrasyonu.** 5a'nın deterministik ada/parsel sorgu akışını tam sohbet Akif ile değiştirir; parsel sorgu yeteneği yeni bir Akif aracı (`lookupParcel`) olarak korunur. 5b (haftalık özet/eşik uyarısı cron'u) kapsam DIŞI. | YAZILIYOR |
| Akif-4 | Avatar + gerçek özel/lisanslı ses | ertelendi |

**Eski 5a/5b tanımı (referans, artık bu spec'in kapsamını daraltıyor):** 5a = inbound rule-based sorgu botu (`handleMessage.ts`, `QueryUnderstanding`/`extractParcelQuery.ts` regex, `resolveLocation.ts` TKGM fuzzy eşleştirme, `renderCard`). 5b = outbound haftalık özet + eşik-fiyat uyarısı (`sendTemplate.ts`, Meta template, cron `notify:run`).

## 1. Amaç, kapsam, onaylanan kararlar

**Amaç:** WhatsApp'taki kullanıcı artık katı bir "il→ilçe→mahalle→ada→parsel" state machine'iyle değil, `/akif` web sayfasındakiyle aynı serbest sohbetle konuşur — terim sorabilir, senaryo karşılaştırması isteyebilir, VE parsel sorgusu yapabilir (aynı gerçek motor, artık bir Akif aracı üzerinden).

### Onaylanan kararlar (2026-09-15 brainstorming)

- **Kapsam: geniş — tam sohbet Akif'i, 5a'nın YERİNE geçer.** Dar seçenek (yalnız `QueryUnderstanding`'i LLM'e çevirmek) reddedildi — Akif'in gerçek değeri (terim, senaryo, ileride hafıza) hiç kullanılmayacaktı.
- **Parsel sorgusu: Akif'in bir ARACI olur, kaybolmaz.** Yeni `lookupParcel` tool'u `resolveLocation.ts`+`buildDegerCard` (mevcut, dokunulmamış deterministik motor) sarar — uydurma sayı riski yok, mevcut `explainTerm`/`compareContractorOffers` desenlerinin aynısı.
- **Hafıza (Akif-3, Arsa Dosyası): v1'de YOK.** WhatsApp sohbeti her zaman anonim/hafızasız kalır (web'in projesiz sohbetiyle aynı) — telefon↔hesap eşleştirmesi ayrı, karmaşık bir problem, v1'e dahil edilmedi.
- **Maliyet: AYRI aylık bütçe havuzu.** Yeni `AKIF_WHATSAPP_MONTHLY_BUDGET_USD` — herkese açık bir telefon numarası web'den farklı kötüye kullanım riski taşır, bir kanalın bütçesi dolması diğerini kapatmamalı.
- **5b (haftalık özet/eşik uyarısı GÖNDERİMİ): tamamen kapsam DIŞI, dokunulmaz.** AMA kart-sonrası "bu mahalleyi takip edeyim mi?" abone-olma DAVETİ + `DURDUR` opt-out AYNEN korunur (5b'nin abone kitlesi bu davet olmadan zamanla kurur) — `lookupParcel` başarılı döndüğünde Akif konuşmasının sonuna bu davet eklenir.
- **Geçiş: SERT geçiş.** Deploy anında yarım kalmış eski `ConvState` (pending/candidates) yok sayılır/silinir — zaten 30dk TTL'li geçici state, kalıcı veri kaybı yok.
- **Mimari: YENİ, ayrı bir handler.** `handleMessage.ts`'i genişletmek yerine yeni bir dosya — state-machine mantığıyla serbest-sohbet mantığını aynı fonksiyonda dolaştırmamak için, ve kolay geri-alınabilirlik (webhook'un tek bir import'unu değiştirmek yeterli) için.

### Kapsam DIŞI (Akif-5 v1)

- 5b'nin kendisi (cron, template gönderimi, digest/eşik hesaplama) — dokunulmaz
- WhatsApp'ta Arsa Dosyası / hafıza (Akif-3 entegrasyonu)
- Telefon numarası ↔ ArsaBil hesabı eşleştirmesi
- Sesli WhatsApp mesajı (Akif-2 entegrasyonu)
- Sesle aksiyon/senaryo kaydetme WhatsApp'ta (Akif-2-Aksiyon entegrasyonu)
- Eski `ConvState` için geriye dönük uyumluluk kodu

## 2. Mimari — genel bakış

```
WhatsApp kullanıcı
  → POST /api/whatsapp/webhook  (imza doğrulama + parseInbound — DEĞİŞMEDİ)
       │
       ▼  (after() — deferred, DEĞİŞMEDİ)
  YENİ: runWhatsappAkifTurn(msg, deps)
    1. Idempotency (WhatsappConversation.lastMessageId) — DEĞİŞMEDİ
    2. Rate limit — WHATSAPP_INBOUND (spam guard, DEĞİŞMEDİ) + YENİ AKIF_WHATSAPP_TURN (telefon-bazlı, LLM-maliyet guard'ı)
    3. DURDUR/opt-out keyword — DEĞİŞMEDİ, Akif'ten ÖNCE, LLM'e hiç gitmeden çalışır
    4. WhatsappConversation.state'ten geçmişi oku (YENİ şekil: { history: AkifMessage[] })
    5. runAkifTurn(...) — Akif-1 orchestrator'ın AYNISI, YENİ `lookupParcel` tool'u dahil tool setiyle
    6. Tool sonucu ParcelCard ise VE başarılıysa → abone-olma daveti (5b'nin mevcut opt-in akışı) turn'e eklenir
    7. AkifTurn.speech → WhatsApp metnine render + gönder (sendText, DEĞİŞMEDİ)
    8. Geçmiş + lastMessageId kaydet
```

## 3. Bileşenler

### 3.1 Yeni `lookupParcel` Akif aracı — YALNIZ WhatsApp kanalında (2026-09-16 düzeltmesi)

**Önemli düzeltme (plan yazımı sırasında bulundu):** `AKIF_TOOL_DEFS` (OpenAI'a verilen araç listesi) bugün `openaiClient.ts`'in `chatWithTools`/`finalStructured` fonksiyonlarında SABİT KODLANMIŞ — hiçbir çağıran bunu override edemiyor. `lookupParcel`'i doğrudan paylaşılan `AKIF_TOOL_DEFS`'e eklemek, onu web `/akif` VE ses (`realtimeSession.ts` `AKIF_TOOL_DEFS`'i `ACTION_TOOL_DEFS` ile birleştiriyor) kanallarına da otomatik açardı — kullanıcı onayı bu KAPSAM DIŞI: yalnız WhatsApp.

Çözüm: `createAkifModel`'e opsiyonel bir `toolDefs?: OpenAiToolDef[]` parametresi eklenir (verilmezse mevcut `AKIF_TOOL_DEFS`'e düşer — web/voice hiç etkilenmez, geriye dönük tam uyumlu, additive). `src/lib/whatsapp/akifToolGateway.ts` (yeni) — paylaşılan `toolRegistry.ts`'i DOKUNMADAN çevreler: 3 mevcut aracın şemasını (`AKIF_TOOL_DEFS`'ten spread) + yeni `lookupParcel` şemasını birleştiren bir dizi, 3 mevcut ad için paylaşılan `validateArgs`/`dispatchTool`'a delege eden + `lookupParcel` için kendi doğrulama/dispatch'ini ekleyen ince bir sarmalayıcı.

`src/lib/ai/akif/gateway/lookupParcel.ts` (yeni, saf modül — `toolRegistry.ts`'e HİÇ eklenmez) — `resolveLocation.ts` (TKGM fuzzy il/ilçe/mahalle, mevcut, dokunulmaz) + `buildDegerCard`/`createAnonCardDeps` (mevcut, dokunulmaz) sarar. Üç çıktı, Akif'in mevcut sözleşmesine (`ToolResultCard`/`needs_confirmation`) yeni kod eklemeden oturur:

- **Resolved** → yeni `ParcelCard` (`ToolResultCard` birleşimine eklenir) — gerçek Değer Kartı verisi, `renderCard.ts`'in formatlama mantığından uyarlanır.
- **Ambiguous** (birden çok il/ilçe/mahalle eşleşmesi) → aday listesi `ParcelCard`'a `candidates` alanı olarak eklenir; Akif kullanıcıya kendi cümleleriyle sorar (mevcut `needs_confirmation` deseniyle aynı ruhta — model sayıyı uydurmaz, sadece seçenek sunar).
- **Not found** → "bulunamadı" sinyali, Akif açıklama ister, tahmin etmez.

WhatsApp-özel bir `toolPolicy` eki (yeni `src/lib/whatsapp/akifToolPolicy.ts`, kısa bir string sabiti) bu aracın belirsiz/bulunamadı durumlarını nasıl ele alacağını anlatır — paylaşılan `toolPolicy.ts` DOKUNULMAZ (o dosya web/voice'un da gördüğü prompt'un parçası).

Bu metnin modele ulaşması için `assembleSystemPrompt`/`runAkifTurn` Akif-3'teki `projectMemory` ile AYNI desende bir alan daha kazanır: `PromptContext.extraSystemPrompt?: string` (assemble.ts, tanımlıysa son katman olarak eklenir) + `RunAkifTurnInput.extraSystemPrompt?: string` (orchestrator.ts, doğrudan geçirir). Web/voice bu alanı hiç geçirmediği için davranışları birebir korunur — regresyon kilidi Akif-3'ünkiyle aynı testle doğrulanır (`extraSystemPrompt` verilmezse çıktı bugünküyle birebir aynı).

**Üçüncü düzeltme (plan yazımı sırasında bulundu):** orchestrator.ts'in tool-sonucu enjeksiyon adımı (`if (toolResult.kind === 'term') { ... } else { ...toolResult.assumptions...toolResult.rows.map(...) }`) yalnız iki şekli biliyor: `TermCard` (`term`) ve `ScenarioCard` (`contractor_offers`/`apartment_sizes`, `assumptions`/`defaultsUsed`/`rows` alanları var). Yeni `ParcelCard`'ın (`kind:'parcel'`) bu alanları YOK — `else` dalına düşerse `toolResult.rows.map` fırlar. Tek satırlık düzeltme: `if (toolResult.kind === 'term' || toolResult.kind === 'parcel')` — ParcelCard aynen (dönüşümsüz) `turn.tool_result`'a atanır. Web/voice hiçbir zaman `parcel` türü bir sonuç üretmediği için bu dalın davranışı onlar için birebir aynı kalır; regresyon testi mevcut TermCard/ScenarioCard testleriyle zaten örtülü, yeni bir ParcelCard testi eklenir.

### 3.2 Konuşma durumu — `WhatsappConversation` yeniden kullanılır

Yeni model AÇILMAZ. `WhatsappConversation.state: Json` bugün `ConvState` (fields/pending/candidates) tutuyor — artık `{ history: AkifMessage[] }` tutacak. `phone` @unique + `lastMessageId` idempotency deseni birebir korunur. Geçmiş, `/akif`'in 40 mesajlık kırpma sınırıyla aynı mantıkla sınırlanır (token maliyeti kontrolü).

### 3.3 Yeni webhook handler

`src/lib/whatsapp/akifHandleMessage.ts` (yeni) — `handleMessage.ts`'in YERİNE `route.ts`'ten çağrılır. İçeride: idempotency + iki rate-limit katmanı + DURDUR pre-empt + `runAkifTurn` çağrısı + abone daveti enjeksiyonu + state kaydı. `route.ts`'teki değişiklik minimal: `handleMessage`+`ruleBasedUnderstanding` importları ve `buildHandleDeps()` içeriği yeni deps fonksiyonuyla değişir, imza doğrulama/`parseInbound`/`after()` sarmalayıcısı AYNEN kalır.

### 3.4 Maliyet guard'ları

`AKIF_WHATSAPP_MONTHLY_BUDGET_USD` env (yeni, `AKIF_MONTHLY_BUDGET_USD`'den bağımsız). `AkifTurnLog` TEK tablo kalır (yeni tablo YOK) — kanal ayrımı `conversationId` alanının `wa:<phone>` öneki üzerinden yapılır.

**İkinci düzeltme (plan yazımı sırasında bulundu):** `createAuditLogger(db).monthSpendUsd(now)` bugün TÜM `AkifTurnLog` satırlarını (kanal ayrımı olmadan) topluyor — "ayrı bütçe havuzu" onayı bunu gerektirdiği için `audit.ts`'e opsiyonel bir üçüncü parametre eklenir: `createAuditLogger(db, { conversationIdPrefix? })`. Verilmezse (web'in mevcut çağrısı) davranış birebir aynı kalır; WhatsApp handler'ı `{ conversationIdPrefix: 'wa:' }` geçirir, `monthSpendUsd`'nin `aggregate` WHERE'ine `conversationId: { startsWith: prefix }` eklenir. Additive, geriye dönük tam uyumlu.

`RATE_LIMITS.AKIF_WHATSAPP_TURN` (yeni, telefon-bazlı, `{ limit: 8, windowMs: 60_000 }` — `AKIF_TURN`'ün IP-bazlı limitiyle aynı kademe) — mevcut `WHATSAPP_INBOUND` (`{ limit: 10, windowMs: 60_000 }`, spam guard) limitinin YANINA eklenir, onun yerine geçmez.

### 3.5 Silinen dosyalar (ölü kod)

Bu değişiklik "tam değiştir" olduğu için aşağıdakiler artık hiçbir yerden çağrılmaz, kod tabanında BIRAKILMAZ:
`src/lib/whatsapp/handleMessage.ts` (+testi), `src/lib/whatsapp/understanding.ts` (+testi varsa), `src/lib/whatsapp/extractParcelQuery.ts` (+testi). `resolveLocation.ts`, `matchAreaName.ts`, `renderCard.ts`, `renderFollowup.ts` (abone daveti için), `renderError.ts`'in DURDUR/rate-limit ile ilgili kısımları, `parseInbound.ts`, `conversation.ts`, `sendMessage.ts`, `sendTemplate.ts` — HEPSİ KORUNUR (ya doğrudan yeni handler'da ya da `lookupParcel` aracında yeniden kullanılır).

## 4. Test / kenar durumları

- `lookupParcel` aracı: resolved/ambiguous/notfound üç dal, `validateArgs` ile mevcut araç şemasıyla aynı desende doğrulama.
- Yeni handler: idempotency (aynı `messageId` iki kez işlenmez), iki ayrı rate-limit'in ikisi de test edilir (biri diğerini maskelemez), DURDUR'un Akif'e hiç ulaşmadan çalıştığı (mock `runAkifTurn` çağrılmadığı doğrulanır), aylık bütçe dolunca 503 (web Akif'in mevcut deseniyle aynı), abone daveti yalnızca `lookupParcel` başarılı VE kullanıcı zaten abone değilse eklenir.
- Regresyon: `AkifTurnLog`'un web Akif sorgularını `wa:` önekiyle karıştırmadığı (kanal ayrımı doğru filtreleniyor).
- Silinen dosyaların gerçekten hiçbir yerden import edilmediği (tsc + grep ile doğrulanır, implementasyon planında ayrı bir adım).

## 5. Deploy kapısı

- Yeni env: `AKIF_WHATSAPP_MONTHLY_BUDGET_USD` (Coolify).
- Migration YOK (yeniden kullanılan modellerin şeması değişmiyor, `state: Json` zaten şekil-esnek).
- İnsan dumanı (deploy sonrası, gerçek WhatsApp numarasıyla): serbest sohbet + parsel sorgusu (resolved/ambiguous/notfound) + abone daveti + DURDUR + aylık bütçe/rate-limit tetiklemesi — `/akif` web tarafının aksine BU insan testi hiçbir zaman otomatikleştirilemez (gerçek Meta webhook + gerçek telefon gerekiyor), `docs/akif/akif-2-insan-duman-kontrol-listesi.md`'ye "Akif-5" bölümü eklenmeli (implementasyon planının son adımı).
