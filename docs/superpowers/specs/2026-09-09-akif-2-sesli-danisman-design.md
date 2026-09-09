# Alt-proje: Akif — Sesli Danışman · Faz 2 (Akif-2) tasarımı

**Tarih:** 2026-09-09
**Branch:** `codex/professional-ui-and-land-cost` (HEAD `79eeee8`)
**Üst bağlam:** `docs/arsabil-ai-akif-product-vision-v1.1.md` (vizyon), `docs/akif/voice-character-spec-v0.1.md`, `docs/superpowers/specs/2026-08-31-akif-1-metin-mvp-design.md` (Akif-1 — bağlı olduğumuz metin motoru). [[project_arsabil]], [[project_arsabil_edermi_rakip]] (Akif = "alt-proje 4" decomposition'ı).

## 0. Akif dekompozisyonu — güncel

| Alt-proje | Kapsam | Durum |
|---|---|---|
| Akif-1 | Metin MVP: orkestratör + Tool Gateway + çift-kanallı sözleşme + sayı güvenliği + `/akif` metin sohbet + `gpt-4o-mini` + eval | **BİTTİ + merge'li** (`3ca6fc0`), deploy edilmedi |
| **Akif-2 (bu spec)** | **Sesli Danışman**: WebRTC + OpenAI Realtime (Hibrit-A) + canlı transkript + sunucu-taraflı VAD + barge-in + Akif-1 motoruna tool köprüsü. **Salt-okunur** — hesaplar/açıklar/anlatır. | YAZILIYOR |
| **Akif-2-Aksiyon** | Sesle uygulama aksiyonları (senaryo kaydet, parametre değiştir+tekrar hesapla, parsel sorgula, dosya aç). Kendi güvenlik modeli: yıkıcı/maliyetli aksiyonda sesli onay, "doğru anladım mı" ekran teyidi, geri alma, yetki. | AYRI DÖNGÜ, sonra |
| Akif-3 | Kalıcı hafıza + Arsa Dosyası + "hatırla/unut" | sonra |
| Akif-4 | Avatar + gerçek özel/lisanslı ses + sosyal medya | ertelendi (vizyon) |
| Akif-5 | 5a/5b entegrasyonu (WhatsApp `QueryUnderstanding` + bildirim metinleri) | sonra |

**Bu decomposition 2026-09-09 brainstorming'de kullanıcı tarafından onaylandı** (Akif-2 = danışman, Akif-2-Aksiyon ayrı; ses döngüsü aksiyonun ön koşulu).

## 1. Amaç, kapsam, onaylanan kararlar

**Amaç:** Kullanıcı `/akif` sayfasında sesli sohbete geçer; arsa alanını, emsali, müteahhit payını *konuşarak* söyler; Akif dinler, eksikleri sözlü sorar, sayıları backend'de doğrular, mevcut deterministik kat-karşılığı motoruyla senaryoları hesaplar, sonucu doğal konuşma + ekranda doğrulanmış kartla anlatır. Kullanıcı Akif'in sözünü kesebilir.

### Onaylanan kararlar (2026-09-09 brainstorming)

- **Ses teknolojisi: Hibrit-A.** OpenAI Realtime API (speech-to-speech) *konuşma yüzeyi* olarak; sayı/hesap gerektiren her tur backend'e tool çağrısıyla iner ve Akif-1'in doğrulama hattından geçer. Realtime modeli sayıyı asla kendisi hesaplamaz.
  - *Gerekçe:* B hattı (STT→LLM→TTS) ~$0.01–0.02/dk ama robotik/santral hissi + elle barge-in. Güncel fiyatlarla `gpt-realtime-mini` ~$0.02–0.05/dk — maliyet farkı büyük ölçüde kapandı, akıcılık/barge-in çok daha iyi. Eski "$0.25/dk" korkusu 2024-25 tarifesiydi, geçersiz.
- **Model:** `AKIF_VOICE_MODEL` env, varsayılan `gpt-realtime-mini`. Kalite yetmezse `gpt-realtime` — kod değişmez.
  - *Not:* Brainstorming'in ilk turunda (B hattı varsayımıyla) "hesap turları `gpt-4o`" konuşulmuştu. Hibrit-A'ya geçince bu geçersiz kaldı: tool köprüsü `dispatchTool`'u **doğrudan** çağırır (saf deterministik motor, ortada LLM yok). Akif-2'de hiçbir yerde `gpt-4o` yok. Akif-1 metin motoru ayrı iş, `gpt-4o-mini`'de kalır.
- **Karadeniz aksanı:** Realtime'ın **hazır ses seti** kullanılır (kendi ses yüklenemez/klonlanamaz). Ton prompt ile yönlendirilir: "sıcak, hafif Karadeniz ritmi, cümle sonu ses düşüşü, esprili". Gerçek fonolojik taklit YOK — `voice-character-spec-v0.1.md`'nin "%70 standart / %20 ritim / %10 imza, fonetik taklit YOK" kararıyla birebir. Gerçek özel/lisanslı ses = Akif-4 ile birlikte.
- **Yerleşim:** ayrı route YOK. `/akif` sayfasına "🎙 Sesli konuş" modu — aynı sayfa, paylaşılan transkript, sesli modda metin kutusunun yerini `AkifVoicePanel` alır.
- **Görsel senkron:** Akif-1'in mevcut kartları (`AkifScenarioCard`, `AkifAssumptionsBar`, `AkifMessageBubble`) yeniden kullanılır. Yeni animasyonlu görsel sistem YOK (vizyon §29'un "1.350 m² animasyonla belirir" sineması sonraki cila).
- **Canlı transkript:** iki taraf da yazıyla gösterilir — sayı doğrulama şartı (vizyon §30) + erişilebilirlik için zorunlu.
- **Auth:** sesli mod **giriş şart**. Metin Akif anonim kalır (değişmez).
- **Sıra algılama:** Realtime'ın **sunucu-taraflı `semantic_vad`**'ı. Kendi VAD'ımız yok.
- **Barge-in:** `input_audio_buffer.speech_started` → yerel `<audio>` durur + `response.cancel`.
- **Taşıma:** WebRTC (OpenAI'nin tarayıcı önerisi). Backend efemeral token basar; gerçek `OPENAI_API_KEY` tarayıcıya hiç inmez.
- **Tool yürütme:** tarayıcı tool çağrısını `/api/akif/voice/tool`'a iletir; backend `validateArgs` + `dispatchTool` + audit → doğrulanmış `ToolResultCard`. Motor mantığı tarayıcıya inmez.

### Kapsam DIŞI (Akif-2)

- Sesle uygulama aksiyonu / mutasyon / navigasyon (Akif-2-Aksiyon)
- Kalıcı konuşma hafızası, Arsa Dosyası, "hatırla/unut" (Akif-3)
- Avatar, viseme/dudak-senkron, gerçek özel/lisanslı ses, sosyal medya (Akif-4)
- WhatsApp / sesli mesaj (Akif-5)
- B hattı (STT→LLM→TTS), özel TTS sağlayıcı, ses klonlama
- Animasyonlu "voice + visual" sinema katmanı (sonraki cila)
- Yeni tool eklenmesi — Akif-1'in 3 tool'u (`explainTerm`, `compareContractorOffers`, `compareApartmentSizes`) aynen
- `lookupParcel*` / risk snapshot tool'u
- Playwright/otomatik tarayıcı E2E (WebRTC+mic simüle edilemez — insan dumanı)
- Oturum sonrası gece uzlaştırma job'u (kayıp `usage` kabul edilir, v1)
- Çoklu eşzamanlı sesli oturum (kullanıcı başına 1)

## 2. Mimari — genel bakış

Üç katman. Ses yolu düşük gecikme için **doğrudan tarayıcı↔OpenAI**; her sayı/hesap **backend'den geçip doğrulanır**.

```
┌─ TARAYICI (WebRTC istemcisi) ─────────────────────────────┐
│  Mikrofon yakalama + ses oynatma                           │
│  RTCPeerConnection (audio ↔ OpenAI, doğrudan)             │
│  Canlı transkript (AkifMessageBubble + Akif-1 kartları)   │
│  Barge-in: speech_started → yerel oynatma dur + cancel     │
│  tool.call → backend'e relay                               │
└──────────────┬──────────────────────────┬─────────────────┘
     ephemeral │ token                     │ tool çağrısı
               ▼                           ▼
┌─ BACKEND (Next.js route'ları + saf lib) ──────────────────┐
│  POST /api/akif/voice/session  auth + kota + token bas    │
│  POST /api/akif/voice/tool     validateArgs + dispatchTool │
│                                 + audit                    │
│  POST /api/akif/voice/usage    oturum sonu: dk + maliyet   │
└──────────────┬───────────────────────────────────────────┘
   (ses buradan GEÇMEZ; yalnız token + tool + usage)
               ▼
┌─ OpenAI Realtime (gpt-realtime-mini / gpt-realtime) ──────┐
│  Speech-to-speech, sunucu-taraflı semantic VAD             │
│  Akif sistem prompt'u + ses ritmi eki                      │
│  AKIF_TOOL_DEFS (Akif-1'den birebir yeniden kullanım)      │
└──────────────────────────────────────────────────────────┘
```

## 3. Bileşenler

### 3.1 İstemci — `src/components/akif/voice/`

| Modül | Sorumluluk | Bağımlılık (DI/dış) |
|---|---|---|
| `useRealtimeVoice.ts` | Hook. `/voice/session`'dan token → `RTCPeerConnection` + mic track + uzak track → `<audio>`. Durum makinesi `idle → connecting → listening → speaking → error`. Barge-in olayında yerel oynatmayı sustur + `response.cancel`. Oturum süresi sayacı; 9. dk kapanış uyarısı enjeksiyonu; "Bitir"/timeout/kota/kopma → `pc.close()` + `/voice/usage` (sendBeacon). Tek otomatik yeniden bağlanma. | `RTCPeerConnection`, `navigator.mediaDevices`, `voiceEvents`, `voiceToolBridge` |
| `voiceEvents.ts` | **Saf.** Ham Realtime data-channel olay JSON → uygulama olayı birliği: `transcript.delta` (kim + metin), `tool.call` (id, ad, args), `speech.started`, `response.done` (usage), `error`. WebRTC'siz, tam test edilebilir. | – |
| `voiceToolBridge.ts` | **Saf.** `tool.call` → `POST /api/akif/voice/tool` gövdesi üret; dönüşü (`ToolResultCard` \| `{error}`) → `conversation.item.create` `function_call_output` mesajına + `response.create` tetiğine çevir. | `fetch` (DI) |
| `AkifVoicePanel.tsx` | Mikrofon orb'u (idle/listening/speaking görsel durum), "Bitir" butonu, süre sayacı, hata bandı, mikrofon-izni akışı. | `useRealtimeVoice` |
| `AkifVoiceTranscript.tsx` | Canlı transkript: `AkifMessageBubble` streaming delta; `tool.call` doğrulanmış sonuç dönünce `AkifScenarioCard`/`AkifAssumptionsBar`. | Akif-1 bileşenleri |

`src/app/akif/page.tsx`: mevcut `AkifChat`'in üstüne "🎙 Sesli konuş" düğmesi (yalnız giriş yapılmışsa + `session` route 200 verirse görünür). Basınca `AkifVoicePanel` metin kutusunun yerini alır; transkript state paylaşılır.

### 3.2 Sunucu — `src/lib/ai/akif/voice/` + `src/app/api/akif/voice/`

| Modül | Sorumluluk | Bağımlılık (DI) |
|---|---|---|
| `realtimeSession.ts` | **Saf DI.** Realtime oturum config nesnesi: `assembleSystemPrompt()` + ses ritmi eki, `AKIF_TOOL_DEFS`, ses adı (`AKIF_VOICE_NAME`, varsayılan `verse`), `turn_detection: { type: 'semantic_vad' }`, `model` (`AKIF_VOICE_MODEL`), `max_response_output_tokens`, ses formatı. | `prompts/assemble`, `gateway/toolRegistry` (`AKIF_TOOL_DEFS`) |
| `voiceRhythm.ts` | **Saf.** Ses ritmi prompt eki sabiti (Karadeniz ton yönlendirmesi, fonetik taklit yasağı, sayıları net telaffuz kuralı). `voiceProfile.ts` (zaten var, 5 test, bağlı değil) buraya bağlanır. | – |
| `voiceQuota.ts` | **Saf DI.** `checkVoiceQuota(deps)` → global aylık USD (`AKIF_VOICE_MONTHLY_BUDGET_USD`) + kullanıcı aylık dakika (`AKIF_VOICE_USER_MONTHLY_MINUTES`). `checkMonthlyBudget` desenini genişletir. | audit: `voiceMonthSpendUsd(now)`, `voiceUserMonthSeconds(userId, now)` |
| `voiceCost.ts` | **Saf.** `estimateVoiceCostUsd({ model, durationSec, usage? })` — gerçek `usage` (Realtime `response.done` toplamı) varsa onu, yoksa süre × tarife sabiti. Her iki model tarifesi `VOICE_RATES` sabiti. | – |
| `voiceAudit.ts` | **DI (Prisma).** `logVoiceTurn`, `logVoiceSession`, `voiceMonthSpendUsd`, `voiceUserMonthSeconds`. Akif-1 `audit.ts` deseninin ses eşi — **ham metin/transkript YAZILMAZ**, yalnız sayaç/meta. | `db` (dar arayüz) |
| `session/route.ts` | `POST`. Rate-limit (`AKIF_VOICE_SESSION`) → auth (giriş şart, 401) → `readAkifEnv` (503) → `checkVoiceQuota` (429/503) → OpenAI REST `POST /v1/realtime/sessions` (config = `realtimeSession`) → efemeral `client_secret` + oturum id tarayıcıya. | `getServerSession`, `realtimeSession`, `voiceQuota`, `voiceAudit` |
| `tool/route.ts` | `POST`. Rate-limit → auth → gövde (`sessionId`, `toolName`, `args`) → `validateArgs` (başarısız → `{error:'invalid_args', field, reason}`) → `dispatchTool(n, a, { db })` → `logVoiceTurn` → doğrulanmış `ToolResultCard`. Hata → `{error:'tool_unavailable'}` 502. | `toolRegistry`, `voiceAudit`, `prisma` |
| `usage/route.ts` | `POST` (sendBeacon uyumlu). Gövde: `sessionId`, `durationSec`, `toolCalls`, `realtimeUsage?`, `endReason`. → `voiceCost` → `logVoiceSession`. Idempotent (aynı `sessionId` ikinci kez → no-op). | `voiceCost`, `voiceAudit` |

### 3.3 Veri modeli (Prisma — elle migration, proje deseni)

```prisma
model AkifVoiceSessionLog {
  id          String   @id @default(cuid())
  userId      String
  startedAt   DateTime
  endedAt     DateTime @default(now())
  durationSec Int
  toolCalls   Int      @default(0)
  estCostUsd  Float    @default(0)
  endReason   String   // user_ended | timeout | error | quota | disconnect
  @@index([userId, startedAt])
  @@index([startedAt])
}

model AkifVoiceTurnLog {
  id        String   @id @default(cuid())
  sessionId String
  createdAt DateTime @default(now())
  tool      String?
  intent    String?
  estCostUsd Float   @default(0)
  @@index([sessionId])
}
```

Migration `20260909xxxxxx_add_akif_voice_logs` — **yalnız dev DB'ye uygulanır** (prod migration'ları büyük deploy batch'inde, bkz. [[project_arsabil_edermi_rakip]]).

## 4. Veri akışı — tam tur

### Oturum başlangıcı
1. Kullanıcı `/akif` → "🎙 Sesli konuş".
2. `POST /api/akif/voice/session` → auth → `checkVoiceQuota` → OpenAI `POST /v1/realtime/sessions` (config) → efemeral token (≤60 sn geçerli) + `sessionId` döner.
3. Tarayıcı `RTCPeerConnection` + mic track; SDP offer/answer OpenAI ile; data-channel açılır. Durum → `listening`.

### Normal tur (hesap yok)
4. Kullanıcı konuşur → ses doğrudan OpenAI'ye. `semantic_vad` sonu algılar.
5. OpenAI kısmi kullanıcı transkripti + Akif ses/metin yanıtını streamler → `voiceEvents` → `AkifVoiceTranscript` canlı yazar. Durum → `speaking`.
6. `response.done` (usage taşır, tarayıcıda toplanır) → durum → `listening`.

### Hesap turu (tool çağrısı)
7. Kullanıcı: "müteahhit %45 verse bana kaç daire düşer?"
8. Realtime `compareContractorOffers` function-call → data-channel `tool.call`.
9. `voiceToolBridge` → `POST /api/akif/voice/tool { sessionId, toolName, args }`.
10. Backend: auth → `validateArgs` → geçerse `dispatchTool` (motor + `resolveEngineDefaults`) → `logVoiceTurn` → doğrulanmış `ToolResultCard`. Geçersizse `{error:'invalid_args', field, reason}`.
11. Tarayıcı sonucu `conversation.item.create` (`function_call_output`) + `response.create`.
12. Realtime sonucu **seslendirir**; `AkifVoiceTranscript` aynı anda `AkifScenarioCard` render eder (ekranda doğrulanmış tablo — vizyon §30).

### Barge-in
13. Akif konuşurken kullanıcı araya girer → `input_audio_buffer.speech_started`.
14. `useRealtimeVoice`: yerel `<audio>` durur + `response.cancel`. Durum → `listening`. Yeni tur adım 4.

### Oturum sonu
15. "Bitir" / `AKIF_VOICE_SESSION_MAX_SEC` timeout / kota / bağlantı kopması → `pc.close()` + `POST /api/akif/voice/usage { sessionId, durationSec, toolCalls, realtimeUsage, endReason }` (sendBeacon) → `voiceCost` → `logVoiceSession`.
16. Timeout'a ~60 sn kala Realtime'a sistem mesajı: "Süremiz doluyor, kısa bir kapanış yap." — Akif ani kesilmez.

## 5. Maliyet ve guard'lar

| Katman | Env (varsayılan) | Mekanizma | Aşılınca |
|---|---|---|---|
| Global aylık bütçe | `AKIF_VOICE_MONTHLY_BUDGET_USD` (30) | `session/route` açılışta `voiceMonthSpendUsd` toplamı | 503 `{reason:'monthly_budget'}` — sesli mod açılmaz, metin Akif çalışır |
| Kullanıcı aylık dakika | `AKIF_VOICE_USER_MONTHLY_MINUTES` (30) | `AkifVoiceSessionLog` `durationSec` toplamı | 429 `{reason:'user_quota', remainingSec}` |
| Oturum süresi | `AKIF_VOICE_SESSION_MAX_SEC` (600) | tarayıcı sayacı + efemeral token `max_session_duration` | 9. dk kapanış uyarısı → 10. dk `pc.close()` `endReason:'timeout'` |
| Oturum-ortası bütçe/kota | – | Realtime `usage` `usage/route`'a akarken backend eşiği geçerse "kapat" sinyali | kapanış uyarısı deseni → `endReason:'quota'` |

**Maliyet kaydı:** `voiceCost` gerçek `usage` (Realtime `response.done`) varsa onu, yoksa süre × `VOICE_RATES[model]` tahminini kullanır. İkisi de `estCostUsd`'a girer; hangisinin kullanıldığı `endReason` yanında değil ama log satırında ayırt edilebilir (usage null ise tahmin).

**Suistimal:** sesli mod giriş şart; `session/route` IP+userId rate-limit (`RATE_LIMITS.AKIF_VOICE_SESSION` — ör. 5/saat); efemeral token 60 sn, tek oturumluk.

## 6. Hata yönetimi

| Durum | Davranış |
|---|---|
| `OPENAI_API_KEY` yok | `session/route` 503; "🎙 Sesli konuş" düğmesi gizli; metin Akif çalışır |
| Mikrofon izni reddedildi | `getUserMedia` reject → panel mesajı + tekrar dene; oturum açılmaz, maliyet yok |
| Efemeral token 60 sn'de bağlanamadı | 1 otomatik retry (yeni token) → yine fail: "Bağlantı kurulamadı" |
| Bağlantı oturum-ortası koptu | `iceconnectionstatechange` `disconnected/failed` → 1 otomatik yeniden bağlanma (transkript korunur, yeni oturuma geçmiş **özet** enjekte) → başarısız: `usage` `endReason:'disconnect'` + banda |
| Tool — `validateArgs` başarısız | `{error:'invalid_args', field, reason}` → `function_call_output` → Realtime sözlü eksik bilgi ister (Akif-1 deseni) |
| Tool — route 5xx/ağ | 1 retry → `{error:'tool_unavailable'}` → Akif: "Şu an hesaplayamıyorum, birazdan tekrar deneyelim"; oturum düşmez |
| Realtime `error` olayı | Transkripte sessiz sistem notu, durum `listening`. 3 ardışık hata → oturum `endReason:'error'` kapanır |
| Bütçe/kota oturum-ortası doldu | "kapat" sinyali → kapanış uyarısı → `endReason:'quota'` |
| STT çöp/anlamsız | Model kendisi "anlayamadım" der (Realtime doğal); özel kod yok |
| `usage` POST başarısız | `sendBeacon` best-effort; gece uzlaştırma YOK (v1 kabul — `usage` çoğunlukla oturum içinde akmış olur) |

**Genel ilke:** tek tur hatası oturumu düşürmez; 3 ardışık hata veya bağlantı kaybı düşürür. Her düşüş `AkifVoiceSessionLog.endReason`'a yazılır.

## 7. Test stratejisi

### Birim (jest — deterministik, API'siz)
- `voiceEvents.ts` — ham olay JSON fixture'ları → beklenen uygulama olayları (delta/tool.call/speech.started/response.done/error)
- `voiceToolBridge.ts` — `tool.call` → doğru POST gövdesi; dönüş → `function_call_output`; hata dönüşü
- `realtimeSession.ts` — config: sistem prompt ses ekini içeriyor, `AKIF_TOOL_DEFS` birebir, `semantic_vad`, model env'den
- `voiceRhythm.ts` — ek sabiti fonetik-taklit yasağı + sayı-telaffuz kuralı içeriyor
- `voiceQuota.ts` — global/kullanıcı eşikleri: sınır, aşım, alt
- `voiceCost.ts` — süre+token→USD; her iki tarife; gerçek `usage` tercih
- `session`/`tool`/`usage` route'ları — auth yok→401; kota→429/503; `invalid_args` gövdesi; mutlu yol (OpenAI fetch mock)
- **Regresyon:** `toolRegistry`/`assemble`/`orchestrator` DEĞİŞMEDİ — Akif-1 süiti tam yeşil kalır

### Sözleşme testi (script — canlı API'siz)
`src/lib/ai/akif/voice/*.contract.test.ts` — Realtime olay şemalarının beklediğimiz alanları taşıdığını dokümante fixture'lara karşı kilitler (Akif-1 `swContract.test.ts` mantığı).

### Gerçek API dumanı (CI'da KOŞMAZ — `npm run akif:voice-smoke`)
`OPENAI_API_KEY` ile: (1) `session/route` gerçek efemeral token alıyor mu, (2) config reddedilmiyor mu (tool şeması + ses adı geçerli), (3) headless tek turluk `tool.call → /voice/tool → function_call_output` döngüsü. Anahtarsız zarif çıkış. `AKIF_VOICE_SMOKE_BUDGET_USD` guard'lı.

### Tarayıcı (insan dumanı — otomasyona alınmaz)
WebRTC + mikrofon Playwright'ta güvenilir simüle edilemez. Deploy sonrası gerçek cihazda **insan doğrulama kontrol listesi** (spec'e ekli): mikrofon izni, bir hesap turu (ekranda `AkifScenarioCard` + doğru sayı), barge-in (Akif susuyor mu), 10 dk timeout kapanışı, kota mesajı, bağlantı kopması kurtarma.

### TDD sırası
Saf modüller (`voiceEvents`, `voiceCost`, `voiceQuota`, `voiceRhythm`, `realtimeSession`) önce RED→GREEN. Route'lar sonra. İstemci hook'u (`useRealtimeVoice`) en son — en az test edilebilir, en çok manuel.

## 8. Env değişkenleri (yeni)

`.env.example`'a eklenir (hepsi opsiyonel, sesli mod anahtarsız tamamen kapalı):

```
AKIF_VOICE_MODEL=gpt-realtime-mini      # gpt-realtime ile yükseltilebilir
AKIF_VOICE_NAME=verse                   # Realtime hazır ses adı
AKIF_VOICE_MONTHLY_BUDGET_USD=30        # global aylık sert tavan
AKIF_VOICE_USER_MONTHLY_MINUTES=30      # kullanıcı başına aylık
AKIF_VOICE_SESSION_MAX_SEC=600          # oturum başına
AKIF_VOICE_SMOKE_BUDGET_USD=1           # npm run akif:voice-smoke için
```

`OPENAI_API_KEY` Akif-1 ile ortak.

## 9. Deploy kapısı (bu spec merge engeli DEĞİL — büyük batch'e eklenir)

- `20260909xxxxxx_add_akif_voice_logs` prod'a uygulanmadı
- Coolify env: yukarıdaki 6 değişken (en azından `OPENAI_API_KEY` zaten Akif-1 için gerekliydi)
- **Gerçek Realtime API dumanı** (`npm run akif:voice-smoke`) — config'in gerçek API tarafından reddedilmediği (tool şeması + `semantic_vad` + ses adı) prod öncesi doğrulanmalı; reddederse her oturum `session/route`'ta patlar
- İnsan tarayıcı dumanı kontrol listesi (§7)
- Realtime API bölgesel erişim / rate limit OpenAI hesabında kontrol edilmeli

## 10. Bilinen v1 kalıntıları / açık kararlar

- `usage` kayıp senaryosunda gece uzlaştırma yok → maliyet hafif eksik sayılabilir (rate limit + oturum süresi sınırı riski kısıtlar)
- Yeniden bağlanmada "geçmiş özet enjeksiyonu" ham transkriptin LLM özetini gerektirir mi, yoksa client'taki `AkifMessage[]`'i düz mü göndeririz — implementasyonda netleşecek (tercih: düz metin, ek LLM çağrısı yok)
- `voiceQuota` read-modify TOCTOU (Akif-1 `checkMonthlyBudget`'tan miras, düşük risk)
- Realtime ses formatı (`pcm16` vs `g711`) — WebRTC varsayılanı; kod sabiti, gerekirse env
- Kullanıcı başına eşzamanlı tek oturum kilidi client-side (aynı kullanıcı 2 sekme → 2 oturum mümkün; `session/route` kota kontrolü yine de global sınırlar)
