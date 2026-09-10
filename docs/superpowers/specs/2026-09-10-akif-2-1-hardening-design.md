# Alt-proje: Akif — Sesli Danışman · Faz 2.1 hardening tasarımı

**Tarih:** 2026-09-10
**Branch:** `codex/professional-ui-and-land-cost` (HEAD `267b22a`)
**Üst bağlam:** `docs/superpowers/specs/2026-09-09-akif-2-sesli-danisman-design.md` (Akif-2 — bu spec onun final review'inin ertelediği 2 bulgunun tasarımı). [[project_arsabil]], [[project_arsabil_edermi_rakip]].

## 0. Amaç ve kapsam

Akif-2 (sesli danışman) SDD'si 2026-09-10'da tamamlandı. Final whole-branch review 2 bulguyu — kendi ruling'iyle — "Akif-2.1 hardening" adlı bir takip turuna erteledi (ruling F-B). Bu spec o iki bulguyu tek bir tasarım olarak ele alır, çünkü ikisi de aynı eksik parçaya dayanıyor: **sunucu tarafında bir sesli-oturum kaydı yok.**

### Bu spec'in kapsamı

1. **F-B(a) — `/usage` griefing tam fix'i.** Bugün `/session` istemciye tek kullanımlık bir `sessionId` (`crypto.randomUUID()`) veriyor ama bunu hiçbir yere yazmıyor. `/usage` ve `/tool` gövdedeki `sessionId`'ye körlemesine güveniyor. F-C ara-fix'i tek bir forge edilmiş `/usage` POST'unun maliyetini ~$3.60'a kırptı, ama saldırgan **farklı uydurma `sessionId`'lerle** `/usage`'ı saatte 10 kez çağırıp (rate limit tavanı) her seferinde yeni bir `AkifVoiceSessionLog` satırı yazdırabilir → saatte ~$36 → $30 aylık bütçe bir saatte yanar, herkes 503 alır. Kök çözüm: `/session` mint anında sunucuya bir oturum kaydı yazar; `/usage` ve `/tool` bu kaydı doğrular (var mı, çağıranın mı, bitmiş mi).

2. **F-B(b) — transkript-koruyan oturum-ortası yeniden bağlanma.** Bugün oturum ortasında WebRTC koparsa (`connectionState` `failed`, ya da `disconnected` + 5 sn tolerans dolar) oturum biter. Akif-2 spec'i (§6, tablo satırı "Bağlantı oturum-ortası koptu") 1 otomatik yeniden bağlanma + transkript korunması + yeni oturuma geçmiş özeti enjeksiyonu istiyordu — bu, Task 13 planında listelenmişti ama implement edilmedi (sadece "connect-retry + 5 sn ICE-grace" kısmı geldi).

### Kapsam DIŞI

- Oturum sonrası gece uzlaştırma job'u (Akif-2 §10'da zaten v1 kabul — kayıp `usage` kabul edilir)
- `voiceQuota` read-modify TOCTOU (Akif-2 §10, düşük risk, Akif-1'den miras)
- Kullanıcı başına eşzamanlı tek oturum kilidinin sunucu tarafına taşınması (ayrı iş; bu spec'in kaydı bunu kolaylaştırır ama zorlamaz)
- İkiden fazla yeniden bağlanma; oturumlar arası kalıcı hafıza (Akif-3)
- Yeniden bağlanma özetinin LLM ile üretilmesi — özet **istemcide, ek LLM çağrısı olmadan** kurulur
- `AkifVoiceSessionLog` şemasının veya F-C maliyet-kırpma mantığının değişmesi

## 1. Onaylanan kararlar (2026-09-10 brainstorming)

- **Yeniden bağlanma sürekliliği: kompakt durum özeti.** İstemci, kendisinde zaten olan doğrulanmış kartlardan + transkript kuyruğundan kısa bir "bilinen gerçekler" notu üretir, yeni Realtime oturumuna system mesajı olarak enjekte eder. Tam transkript tekrarı (token maliyeti + bağlam şişmesi) ve minimal ("nerede kalmıştık") reddedildi.
- **Oturum kaydı: yeni hafif `AkifVoiceSession` tablosu.** `AkifVoiceSessionLog` bugünkü rolünde kalır (bir-kez-yazılır maliyet kaydı). Kayıt = yaşam döngüsü + sahiplik; log = faturalama. `AkifVoiceSessionLog`'u yeniden kullanma seçeneği (mint anında `endReason:'pending'` satırı) reddedildi — aggregate sorgularını kirletir, yetim satır gürültüsü yaratır.
- **Geçersiz `sessionId` → 403, satır yazılmaz.** Kayıtlı olmayan / başkasına ait / zaten bitmiş `sessionId` sert reddedilir. Canlıda henüz veri yok, geriye dönük uyumluluk gerekmiyor.
- **Yeniden bağlanma aynı `sessionId`'yi korur.** Bir mantıksal sesli oturum = bir `sessionId` = bir faturalama satırı, kopma olsa bile. `/session` resume yolunda taze **token** verir ama **aynı** `sessionId`'yi döndürür.
- **Yeniden bağlanma oturum başına 1 kez.** Spec "tek" diyor. İkinci kopma → oturum biter.
- **Deploy: lokal biriktir.** Bu spec merge engeli değil; migration dev-only, birikmiş batch'e katılır (Akif-2 §9 deploy kapısı geçerli).

## 2. Veri modeli

Yeni Prisma modeli (`prisma/schema.prisma`, `AkifVoiceSessionLog`'un yanına):

```prisma
model AkifVoiceSession {
  id             String    @id                  // /session'ın tarayıcıya verdiği sessionId
  userId         String
  status         String    @default("active")   // 'active' | 'ended'
  reconnectCount Int        @default(0)
  createdAt      DateTime  @default(now())
  endedAt        DateTime?

  @@index([userId, createdAt])
}
```

- `AkifVoiceSessionLog` **değişmez** — hâlâ `id: sessionId` ile bir-kez-yazılır, P2002-korumalı maliyet kaydı.
- **Bayat `active` satır:** `createdAt`, `sessionMaxSec + STALE_SLACK_SEC` (60 sn) 'den eskiyse ölü sayılır. `/session` mint yolu, çağıranın kendi bayat `active` satırlarını fırsatçı olarak `ended` işaretler (`updateMany where userId + status:'active' + createdAt < eşik`). Cron yok.
- Migration: `YYYYMMDDHHMMSS_add_akif_voice_session`, **yalnız dev DB** (elle yazılır — proje deseni). Prod'a Akif batch'iyle birlikte `prisma migrate deploy`.

## 3. `/api/akif/voice/session` — mint ve resume

Route artık opsiyonel bir JSON gövde okur: `{ resumeSessionId?: string }`. Gövde yoksa / parse edilemezse → mint yolu (bugünkü davranış).

### Mint yolu (`resumeSessionId` yok)

Bugünkü akış + kayıt satırı:

1. auth (401) → rate-limit (`AKIF_VOICE_SESSION`, 429) → `readVoiceEnv` (503)
2. `checkVoiceQuota` (global bütçe → 503 `monthly_budget`; kullanıcı dakika → 429 `user_quota`)
3. çağıranın bayat `active` satırlarını `ended` işaretle (fırsatçı sweep)
4. OpenAI `POST /v1/realtime/client_secrets` → token (502)
5. `prisma.akifVoiceSession.create({ data: { id: crypto.randomUUID(), userId, status: 'active' } })`
6. `Response.json({ token, expiresAt, sessionId: <yeni id>, model, sessionMaxSec })`

### Resume yolu (`resumeSessionId` var)

1. auth (401) → rate-limit (aynı `AKIF_VOICE_SESSION` bucket, 429)
2. `readVoiceEnv` (503)
3. kaydı getir: `prisma.akifVoiceSession.findUnique({ where: { id: resumeSessionId } })`
   - satır yok **veya** `row.userId !== userId` **veya** `row.status !== 'active'` **veya** `row.reconnectCount >= 1` **veya** `row.createdAt` `sessionMaxSec + STALE_SLACK_SEC`'ten eski → **409** `{ error: 'resume_denied' }`
4. **yalnız global aylık bütçe kontrolü** (`voiceMonthSpendUsd >= monthlyBudgetUsd` → 503 `monthly_budget`). Kullanıcı dakika kotası **atlanır** — bu, zaten onaylanmış bir oturumun devamı; `sessionMaxSec` ve tek-reconnect ile sınırlı.
5. OpenAI `client_secrets` → taze token (502)
6. `prisma.akifVoiceSession.update({ where: { id }, data: { reconnectCount: { increment: 1 } } })`
7. `Response.json({ token, expiresAt, sessionId: resumeSessionId, model, sessionMaxSec })` — **aynı** `sessionId`

## 4. `/api/akif/voice/usage` ve `/tool` — sahiplik guard'ı

Yeni paylaşılan yardımcı — `src/lib/ai/akif/voice/voiceSession.ts`:

```ts
export type VoiceSessionCheck =
  | { ok: true; status: 'active' | 'ended' }
  | { ok: false; code: 'unknown_session' | 'forbidden_session' }

export async function checkVoiceSessionOwner(
  db: VoiceSessionDb,
  sessionId: string,
  userId: string,
): Promise<VoiceSessionCheck>
```

- satır yok → `{ ok: false, code: 'unknown_session' }`
- `row.userId !== userId` → `{ ok: false, code: 'forbidden_session' }`
- aksi halde → `{ ok: true, status: row.status }` — **gerçek** satır durumu (bayatlık coercion'ı YOK; bayat `active` satır `/usage`'da normal finalize edilir — hiç maliyet kaydı almamıştır)

`VoiceSessionDb` = dar DI arayüzü (`akifVoiceSession.findUnique` + `.update`), `voiceAudit.ts`'in `VoiceAuditDb` deseniyle aynı. Bayatlık kontrolü yalnız `/session` resume yolunda ve mint sweep'inde (§3) inline yaşar — bu yardımcıda değil.

### `/usage` route

Bugünkü sıra + guard:

1. auth (401) → rate-limit `AKIF_VOICE_USAGE` (429)
2. gövde `req.text()` + `JSON.parse` + alan doğrulama (bugünkü — `sessionId`/`startedAtMs`/`durationSec`/`toolCalls` tipleri, `startedAtMs` 24 saat penceresi)
3. **`checkVoiceSessionOwner`** → `!ok` ise **403** `{ error: <code> }`, DB'ye dokunma
4. cost mantığı (bugünkü, DEĞİŞMEZ): model/`sessionMaxSec` fallback → `roundedDuration` clamp → **`realtimeUsage` F-C clamp'i (`usageCap = sessionMaxSec * 200`) aynen** → `estimateVoiceCostUsd`
5. `createVoiceAuditLogger(db).logVoiceSession(...)` (P2002 idempotent — DEĞİŞMEZ). **FR-I1 fix'i sonrası `status === 'ended'` satır için de çağrılır** — bayat-sweep'lenmiş (`endStaleCallerSessions`) oturumlar aksi halde hiç faturalanmaz. Gerçek çift-beacon P2002 ile sessiz no-op.
6. `status !== 'ended'` ise `prisma.akifVoiceSession.update({ where: { id: sessionId }, data: { status: 'ended', endedAt: now } })` — zaten `ended` satırda atlanır
7. `Response.json({ ok: true })`

**Griefing matematiği (bu fix'ten sonra):** kullanıcı yalnız kendi gerçekten mint ettiği oturumları finalize edebilir. Mint, `AKIF_VOICE_SESSION` 5/saat rate-limit'i **ve** aylık dakika kotasıyla (varsayılan 30 dk/ay) sınırlı. Zorlanabilecek maksimum harcama ≈ kota-sınırlı (~5 kısa oturum × ~$3.60 F-C clamp) — bugünkü "saatte $36" yerine. Saldırı kapandı.

### `/tool` route

1. auth (401) → rate-limit `AKIF_TURN` (429)
2. gövde doğrulama (bugünkü — `sessionId`/`toolName` tipleri)
3. **`checkVoiceSessionOwner`** → `!ok` ise **403** `{ error: <code> }`
4. `status === 'ended'` → **403** `{ error: 'session_over' }` (oturum kapandıktan sonra tool çağrısı yok)
5. aksi halde bugünkü akış DEĞİŞMEZ (`TOOL_NAMES` kontrol → `validateArgs` → `dispatchTool` → `logVoiceTurn` → kart)

**Not:** `/tool`'un `invalid_args` → 200 sözleşmesi (Realtime'a `function_call_output` olarak beslenir) korunur; sahiplik 403'ü ondan önce gelir.

## 5. `useRealtimeVoice.ts` — yeniden bağlanma akışı

### Refactor (önce)

`start()` içindeki PC-kurulum yarısı (`new RTCPeerConnection()`'dan SDP döngüsü + `setStatus('listening')` + `timerRef` kurulumuna kadar) iç `establishConnection(sessionInfo: SessionInfo, opts: { resume: boolean })` yardımcısına çıkarılır. Hem `start()` hem yeni reconnect yolu bunu çağırır. Bu, park edilmiş "`start()` ~95 satır" minor'ını da kapatır.

`establishConnection`:
- yeni `RTCPeerConnection` (veya `opts.rtcFactory`), `pcRef` ata
- `ontrack` / `onconnectionstatechange` / `addTrack(micStreamRef)` bağla — `micStreamRef` resume'da yeniden kullanılır, yeni `getUserMedia` YOK
- yeni data channel `oai-events`, `message` dinleyici
- SDP: bugünkü 2-denemeli döngü (`CALLS_URL?model=`); resume'da ilk deneme taze token'la (resume `/session` zaten verdi)
- başarısız → throw; çağıran (`start` veya `attemptReconnect`) yakalar
- başarılı: `resume` ise data channel `open`'da `buildResumeContext` enjeksiyonu (bkz §6) → sonra `setStatus('listening')` + timer (timer resume'da **sıfırlanmaz** — `startedAtRef` korunur)

### Yeni durum

`VoiceStatus`'a `'reconnecting'` eklenir. `AkifVoicePanel` bu durumda "Bağlantı yeniden kuruluyor…" gösterir (orb nabız, hata bandı YOK). `AkifVoicePanel.test.tsx` + `useRealtimeVoice.test.tsx` güncellenir.

### Tetikleme

`onconnectionstatechange` içinde bugün `stop('disconnect')` çağıran iki nokta (`failed`; ve `disconnected` grace-timer dolumu) şu olur:

```
if (!reconnectedRef.current) attemptReconnect()
else { setErrorText('Bağlantı koptu.'); stop('disconnect') }
```

### `attemptReconnect()`

1. `reconnectedRef.current = true` (oturum başına toplam 1)
2. `setStatus('reconnecting')`, `clearGrace()`, `pcRef.current?.close()`, `dcRef.current = null`
3. **KORU:** `micStreamRef`, `transcript`, `startedAtRef`, `elapsedSec` timer'ı çalışır durumda, `usageRef`, `toolCallsRef`, `sessionIdRef`
4. `fetchFn(SESSION_URL, { method: 'POST', body: JSON.stringify({ resumeSessionId: sessionIdRef.current }), headers: { 'Content-Type': 'application/json' } })`
   - `!res.ok` (409 dahil) → `setErrorText('Bağlantı koptu.')` + `stop('disconnect')`, return
   - `sess = await res.json()` — `sessionId` aynı gelir (guard)
5. `try { await establishConnection(sess, { resume: true }) } catch { setErrorText('Bağlantı koptu.'); stop('disconnect'); return }`
6. `stoppedRef.current` bu sırada true olduysa (kullanıcı "Bitir" bastı) → sessiz return, `stop` zaten beacon'ladı

### Faturalama tutarlılığı

Aynı `sessionId` → oturumun gerçek sonundaki tek `/usage` beacon'ı tüm oturumu kapsar. `usageRef` / `toolCallsRef` kopma boyunca birikir. Kopma öncesi dakikalar ayrı sayılmaz (Akif-2 §10 kayıp-usage kabulü) — kabul.

## 6. `buildResumeContext` ve uç durumlar

### `buildResumeContext(transcript: VoiceTranscriptItem[]): string`

Saf fonksiyon, kendi dosyası `src/components/akif/voice/voiceResume.ts`, birim testli.

- **son ~8 tur** `{ role, text }` — boş / yalnız-kart satırları atla — `Kullanıcı: … / Akif: …` olarak render
- **son kart** (`transcript`'te `card` taşıyan son öğe), tek satıra düzleştir:
  - `TermCard` → `("<term>" terimi açıklandı)`
  - `ScenarioCard` → `(Son hesap: <kind>, ilk satır "<rows[0].label>" — arsa payı %<arsaPayiX*100>, sahibine <arsaSahibiDaireSayisi ?? "?"> daire / <arsaSahibiDegeriTL ?? "?"> TL)`
- sarmalama:

```
[Bağlantı koptu ve yeniden kuruldu. Buraya kadarki konuşma:]
<turlar>
<kart satırı — varsa>
[Kaldığın yerden devam et. Kullanıcıya bilgileri baştan sordurma.]
```

Enjeksiyon: mevcut desen (`useRealtimeVoice.ts` §9. dk uyarısı ile aynı) —
`safeSend({ type: 'conversation.item.create', item: { type: 'message', role: 'system', content: [{ type: 'input_text', text }] } })`
resume data channel'ının `open` olayında, `setStatus('listening')`'ten önce, bir kez.

### Uç durumlar

| Durum | Davranış |
|---|---|
| Akif cümle ortasında koptu | `akifDraftRef` teardown'da temizlenir; resume context kısmi metni içerir; sorun yok |
| Tek reconnect'ten sonra ikinci kopma | `reconnectedRef` zaten true → `stop('disconnect')` + "Bağlantı koptu." bandı |
| `resume_denied` (409 — satır bayat / zaten reconnect'li / bütçe aşıldı) | `stop('disconnect')` + bant; kullanıcı "Tekrar dene" → tam taze `start()` (yeni sessionId, boş transkript — bugünkü davranış) |
| `reconnecting` sırasında sekme gizlendi / "Bitir" | `stop()` çalışır; beacon aynı `sessionId` + `endReason: 'user_ended'`; kayıt satırı finalize |
| `establishConnection` resume'da SDP iki denemede de başarısız | `stop('disconnect')` + bant |
| İlk `listening`'ten ÖNCE kopma (initial `start` sırasında) | DEĞİŞMEZ — mevcut 2-denemeli SDP retry, bu yol değil |
| Kullanıcı `reconnecting` sırasında konuşuyor | ses yakalanır ama yeni PC henüz yok — kayıp; kabul (kısa pencere, Realtime tekrar sorabilir) |

## 7. Test stratejisi

### Birim (jest — gerçek, API'siz)

- **`voiceResume.test.ts`** (yeni) — `buildResumeContext`: boş transkript → sarmalayıcı + "konuşma yok"; yalnız `TermCard`; `ScenarioCard` düzleştirme (null daire/değer alanları); tur sayısı 8'e kırpma; yalnız-kart satırları atlanıyor
- **`voiceSession.test.ts`** (yeni) — `checkVoiceSessionOwner`: satır yok → `unknown_session`; yanlış user → `forbidden_session`; `active` → `{ ok, status:'active' }` (bayat olsa bile — coercion yok); `ended` → `{ ok, status:'ended' }`
- **`session/__tests__/route.test.ts`** (genişlet) — mint satır `create` ediyor; mint bayat-satır sweep'i; resume yolu: geçerli → aynı id + `reconnectCount` arttı; yanlış user → 409; `reconnectCount>=1` → 409; bayat → 409; resume'da global bütçe aşıldı → 503; resume'da kullanıcı kotası aşıldı ama global temiz → **200** (kota atlanıyor)
- **`usage/__tests__/route.test.ts`** (genişlet) — bilinmeyen session → 403, yazma yok; yanlış user → 403; `ended` → `{ok:true}` ikinci yazma yok; mutlu yol `status`'ü `ended` yapıyor; **F-C forge testi korunuyor** (clamp hâlâ asserte)
- **`tool/__tests__/route.test.ts`** (genişlet) — bilinmeyen / yanlış user → 403; `ended` → 403 `session_over`; mutlu yol DEĞİŞMEDİ
- **`useRealtimeVoice.test.tsx`** (genişlet, sahte `RTCPeerConnection`) — `connectionState='failed'` bir kez → durum `reconnecting` → `listening`, transkript korundu, tek `/session` çağrısı `resumeSessionId` gövdesiyle, `startedAtRef`/timer sıfırlanmadı, resume context `safeSend` edildi; ikinci `failed` → `error` + `stop('disconnect')`; resume 409 → `error`

### Regresyon

`toolRegistry` / `gateway` / `orchestrator` / `voiceCost` / `voiceQuota` DEĞİŞMEDİ — Akif-1 + Akif-2 süitleri tam yeşil kalır. Her SDD task'ında `tsc` 0 + jest + `npm run build`.

### İnsan dumanı (otomasyona alınmaz — `docs/akif/akif-2-insan-duman-kontrol-listesi.md`'ye 2 madde eklenir)

- Oturum ortasında gerçek ağ kesintisi (Wi-Fi kapat-aç) → otomatik yeniden bağlanma, Akif bağlamı koruyor ("baştan sorma" tuttu mu)
- Zorla çift kopma → temiz "Bağlantı koptu." + "Tekrar dene" çalışıyor

### TDD sırası

`buildResumeContext` + `checkVoiceSessionOwner` (saf) önce RED→GREEN. Sonra route genişletmeleri. `useRealtimeVoice` reconnect yolu en son.

## 8. Etkilenen dosyalar

| Dosya | Değişiklik |
|---|---|
| `prisma/schema.prisma` | `AkifVoiceSession` modeli |
| `prisma/migrations/<yeni>/migration.sql` | elle, dev-only |
| `src/lib/ai/akif/voice/voiceSession.ts` | **yeni** — `checkVoiceSessionOwner` + `VoiceSessionDb` |
| `src/app/api/akif/voice/session/route.ts` | resume gövdesi + mint kaydı + sweep |
| `src/app/api/akif/voice/usage/route.ts` | sahiplik guard + `ended` idempotent + `status` flip |
| `src/app/api/akif/voice/tool/route.ts` | sahiplik guard + `session_over` |
| `src/components/akif/voice/voiceResume.ts` | **yeni** — `buildResumeContext` |
| `src/components/akif/voice/useRealtimeVoice.ts` | `establishConnection` refactor + `attemptReconnect` + `'reconnecting'` durumu |
| `src/components/akif/voice/AkifVoicePanel.tsx` | `'reconnecting'` görsel durumu |
| ilgili `__tests__/*` | yukarıda §7 |
| `docs/akif/akif-2-insan-duman-kontrol-listesi.md` | 2 yeni madde |

## 9. Deploy kapısı (bu spec merge engeli DEĞİL)

Akif-2 §9 deploy kapısına eklenir:

- Migration `<yeni>_add_akif_voice_session` prod'a `prisma migrate deploy` (Akif batch'iyle, `AkifVoiceSessionLog` migration'ından sonra sıra fark etmez — bağımsız tablo)
- Yeni env YOK
- İnsan dumanı: yukarıdaki 2 yeni madde (yeniden bağlanma yalnız gerçek ağ kesintisiyle test edilebilir)

## 10. Bilinen kalıntılar / açık kararlar

- Kopma öncesi dakikalar `/usage`'a ayrı akmıyor → aynı `sessionId` sonda tek sefer raporlandığı için kopma anında sayaç kesilmiş olabilir (Akif-2 §10 kayıp-usage kabulüyle tutarlı, düşük risk — `sessionMaxSec` üst sınır)
- `AkifVoiceSession` bayat `active` satırları yalnızca çağıranın sonraki mint'inde temizlenir → hiç geri gelmeyen kullanıcının satırları `active` kalır (küçük, indeksli tablo; gelecekte istenirse haftalık sweep)
- `reconnecting` sırasında kullanıcının konuşması kısa pencerede kaybolur (yeni PC henüz yok) — kabul
- **FR-I1 (final review):** resume yolu `resolveResumableSession` + `bumpReconnectCount` yerine tek atomik `claimReconnect` kullanır — `updateMany({where:{reconnectCount:0,...}, data:{reconnectCount:1}})` kilit görevi görür, eşzamanlı iki resume isteğinden yalnız biri geçer (check-then-act yarışı kapandı). Yan etki: token mint başarısız olursa (502) reconnect yine de "harcanmış" sayılır — kabul, düşük olasılık.
- **FR-I2 (final review):** `/usage` `status === 'ended'` dalı artık erken `{ok:true}` dönmez; `logVoiceSession` çağrılır (P2002-korumalı) ki `endStaleCallerSessions` ile `ended`'e çevrilmiş bayat oturumlar faturalanabilsin. Yalnız `endVoiceSession` atlanır.
- Kullanıcı başına eşzamanlı oturum kilidi hâlâ client-side (Akif-2 §10) — bu kayıt onu sunucuya taşımayı kolaylaştırır ama bu spec zorlamaz
