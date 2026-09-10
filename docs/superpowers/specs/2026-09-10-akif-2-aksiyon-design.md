# Alt-proje: Akif — Sesli Aksiyon · Faz 2-Aksiyon (Akif-2-Aksiyon) tasarımı

**Tarih:** 2026-09-10
**Branch:** `codex/professional-ui-and-land-cost` (HEAD `c243a64` — Akif-2.1 hardening sonrası)
**Üst bağlam:** `docs/arsabil-ai-akif-product-vision-v1.1.md` (vizyon §46-50), `docs/superpowers/specs/2026-09-09-akif-2-sesli-danisman-design.md` (Akif-2 — bağlı olduğumuz ses katmanı), `docs/superpowers/specs/2026-09-10-akif-2-1-hardening-design.md`. [[project_arsabil]], [[project_arsabil_edermi_rakip]] (Akif = "alt-proje 4").

## 0. Akif dekompozisyonu — güncel

| Alt-proje | Kapsam | Durum |
|---|---|---|
| Akif-1 | Metin MVP (orkestratör + Tool Gateway + çift-kanallı sözleşme + sayı güvenliği) | **BİTTİ** (`3ca6fc0`) |
| Akif-2 | Sesli Danışman (WebRTC + Realtime + canlı transkript + barge-in + tool köprüsü). **Salt-okunur.** | **BİTTİ** (`267b22a`) |
| Akif-2.1 | Hardening: session-registry (griefing fix) + transkript-koruyan reconnect | **BİTTİ** (`c243a64`) |
| **Akif-2-Aksiyon (bu spec)** | **Sesle uygulama mutasyonu.** v1: bir hesaplanmış senaryoyu bir projeye kaydet (gerekirse sesle yeni proje oluştur). İki-fazlı güvenlik seremonisi: `prepare*` asla yazmaz → ekran teyit kartı → açık commit (buton VEYA "evet") → geri al. | YAZILIYOR |
| Akif-3 | Kalıcı hafıza + Arsa Dosyası + "hatırla/unut" | sonra |
| Akif-4 | Avatar + gerçek özel/lisanslı ses | ertelendi |
| Akif-5 | 5a/5b entegrasyonu (WhatsApp) | sonra |

## 1. Amaç, kapsam, onaylanan kararlar

**Amaç:** Kullanıcı `/akif` sesli modunda Akif ile bir kat-karşılığı karşılaştırması yaptıktan sonra "bunu kaydet" der; Akif önerdiği senaryoyu bir ekran teyit kartıyla gösterir; kullanıcı sayıları görüp onaylar; senaryo kullanıcının bir projesine yazılır. Kullanıcının hiç projesi yoksa Akif sesle yeni bir proje oluşturmayı önerir.

### Onaylanan kararlar (2026-09-10 brainstorming)

- **v1 tek aksiyon: "senaryo kaydet".** Navigasyon YOK, ses oturumu sürer.
- **Commit kapısı: Yaklaşım A** — sunucu tarafında tek-kullanımlık `AkifPendingAction` + çift commit yolu (buton VEYA sesli "evet" → `commitPendingAction` tool) + geri-al token'ı. Model, bu oturumda gerçek bir `prepareScenarioSave` çağrısı `pendingActionId` üretmeden commit edemez. (B: buton-only + client payload — sesli "evet" çalışmaz, reddedildi. C: model `confirmed:true` arg'ıyla doğrudan yazar — model onay uydurma riski, reddedildi.)
- **Onay seremonisi: ekran teyit kartı + geri al.** Akif "kaydediyorum" der → kart belirir (hedef proje, senaryo adı [düzeltilebilir], arsa payı %, sahibine daire/TL, toplam maliyet, satış fiyatı) → "Kaydet" butonu VEYA sesli "evet" → yazılır → ~30sn "Geri Al" toast'ı.
- **Sesle yeni proje: EVET, ekran teyidiyle.** 0 proje varsa Akif proje adı sorar; kart proje adını da düzenlenebilir gösterir; tek onayla proje + senaryo birlikte oluşur.
- **Risk sınıfı: `low`** (yıkıcı değil, geri alınabilir, kullanıcının kendi verisi). Seremoni yine de tam — sonraki `high`-risk aksiyonların şablonu. Gelecekteki yıkıcı aksiyonlar (sil, toplu) bunun üstüne yazılı/sözlü teyit cümlesi ekler.
- **Deploy: lokal biriktir.** Migration dev-only, Akif batch'ine katılır.

### Kapsam DIŞI (Akif-2-Aksiyon v1)

- Parametre değiştir + tekrar hesapla (Akif zaten tool'la yeniden hesaplıyor — "mutasyon" kısmı kapsam dışı)
- Parsel sorgula, navigasyon, "Arsa Dosyası aç" (Akif-3)
- Mevcut senaryo/proje düzenleme veya silme
- Studio (StudioScenario) mutasyonu
- Sesli geri-al ("geri al" mid-session belirsiz — 30sn toast butonu yeter)
- Playwright/otomatik tarayıcı E2E (WebRTC+mic simüle edilemez — insan dumanı)

## 2. Mimari — genel bakış

```
TARAYICI (/akif sesli mod)
  Realtime model "kaydet" niyeti → prepareScenarioSave tool çağrısı
        │
        ▼  /api/akif/voice/tool  (auth + rate-limit + session ownership — Akif-2.1)
  prepareScenarioSave  (YAZMAZ)
    validateArgs → computeFullScenario (deterministik motor, tek satır)
    → proje hedefi çöz (isim eşleşmesi / 0 / 1 / ≥2)
    → checkPlanLimit ön-kontrol
    → AkifPendingAction satırı yaz (5dk TTL, tek-kullanım)
    → { pendingActionId, confirmCard, needsProjectChoice?, blocked? }
        │
        ▼
  AkifActionConfirmCard  (ekranda — sayılar + düzeltilebilir proje/senaryo adı)
        │
   ┌────┴─────────────────────────┐
   │ "Kaydet" butonu              │ sesli "evet"
   ▼                              ▼
POST /api/akif/voice/action/commit   commitPendingAction tool
   └──────────┬───────────────────────┘
              ▼  commitPendingAction(db, {pendingActionId, userId, sessionId, overrides?})
    satırı yükle+doğrula (sahiplik/session/consumed/expired)
    → checkPlanLimit YENİDEN → proje çöz/oluştur → Scenario.create
    → consumedAt + undoToken + undoUntil (now+30s)
    → { scenarioId, projectId, projectName, undoToken, undoUntil }
        │
        ▼
  "kaydedildi" + Geri Al  →  POST /api/akif/voice/action/undo {undoToken}
```

Ses yolu (WebRTC ↔ OpenAI) Akif-2'den DEĞİŞMEZ. Tüm yazma sunucuda, iki fazlı.

## 3. Veri modeli

Yeni Prisma modeli (`prisma/schema.prisma`, Akif modellerinin yanına):

```prisma
model AkifPendingAction {
  id                String    @id @default(cuid())
  userId            String
  sessionId         String                    // AkifVoiceSession.id
  kind              String                    // v1: yalnız 'save_scenario'
  payload           Json                      // çözülmüş + yeniden hesaplanmış öneri (SaveScenarioPayload)
  createdAt         DateTime  @default(now())
  consumedAt        DateTime?                 // commit'te set → tek-kullanım
  undoToken         String?   @unique         // commit'te üretilir
  undoUntil         DateTime?                 // commit + 30sn
  createdScenarioId String?                   // commit'te set
  createdProjectId  String?                   // commit'te set — YALNIZ bu aksiyon projeyi oluşturduysa

  @@index([userId, createdAt])
}
```

- **TTL kod-tarafında** (`createdAt` 5dk'dan eski → expired, `AkifVoiceSession` deseni). Cron yok; `prepareScenarioSave` çağıranın kendi consumed/expired satırlarını fırsatçı siler.
- **`payload` = `SaveScenarioPayload`** (TS tipi, okurken doğrulanır):
  ```ts
  {
    projectRef: { existingId: string } | { newName: string | null }
    scenarioName: string
    engineInput: CalculationInput          // computeFullScenario çıktısı
    engineOutput: FullScenarioOutput       // motor tam sonucu
    display: {
      arsaPayiPct: number                  // (1 - x) * 100
      sahibineDaire: number | null         // Sdx
      sahibineTL: number | null            // FA
      toplamMaliyet: number                // totalCost
      satisFiyati: number                  // FD_total
    }
  }
  ```
- Migration: `<ts>_add_akif_pending_action`, **yalnız dev DB** (elle yazılır). Prod'a Akif batch'iyle.

## 4. Motor yeniden-hesaplama yardımcısı

Yeni `src/lib/ai/akif/gateway/scenarioEngine.ts`:

- `compareContractorOffers.ts`'teki private `baseInput(...)` buraya `buildScenarioEngineInput(args)` olarak **çıkarılır** (davranış değişmez — aynı girdiler, `compareContractorOffers`/`compareApartmentSizes` aynı 4 alanı tutmaya devam eder).
- `computeFullScenario(args): { input: CalculationInput; output: FullScenarioOutput }` — `buildScenarioEngineInput` + `CalculatorEngineV2.calculate`, TÜM çıktıyı döndürür.
- `FullScenarioOutput` tipi = `CalculatorEngineV2.calculate` dönüş tipi (motordan re-export ya da `ReturnType<typeof CalculatorEngineV2.calculate>`).
- Compare tool'ları bu modülü import eder. `prepareScenarioSave` **seçilen tek satırın** arg'larıyla `computeFullScenario` çağırır.
- **Garanti:** kaydedilen `Scenario`, Akif'in karşılaştırdığıyla bit-aynı — motor deterministik, iki yol da girdiyi aynı kurar.

`args` şekli (seçilen tek satır): `{ arsaAlani, emsal, muteahhitPayi, daireBuyuklugu?, birimMaliyet?, kaliteSinifi? }`. `x = 1 - muteahhitPayi/100`. `totalApartments = floor(arsaAlani * emsal / (daireBuyuklugu ?? 100))` (compare tool'daki formül).

## 5. `prepareScenarioSave` tool

Yeni: `src/lib/ai/akif/gateway/prepareScenarioSave.ts`. `AKIF_TOOL_DEFS` / `ToolName` / `validateArgs` / `dispatchTool`'a eklenir. **YALNIZ ses tool yolunda** (`/api/akif/voice/tool` `TOOL_NAMES`) — Akif-1 metin modunda YOK.

**Args** (Realtime model konuşma bağlamından geçirir):
```
{
  arsaAlani: number, emsal: number, muteahhitPayi: number,   // seçilen TEK %
  daireBuyuklugu?: number, birimMaliyet?: number, kaliteSinifi?: 'standart'|'orta'|'luks',
  projectName?: string,       // kullanıcı proje adı verdiyse / yeni istiyorsa
  scenarioName?: string       // ops.; varsayılan "Akif — Müteahhit %<p>"
}
```

**Davranış (YAZMAZ, tek `AkifPendingAction` hariç):**
1. `validateArgs` — `arsaAlani`/`emsal`/`muteahhitPayi` sonlu & aralıkta (`toolRegistry` `RANGES` yeniden kullan); `muteahhitPayi` 1–99; isim string'leri ≤120 karakter, trim.
2. `computeFullScenario(...)` → tam motor girdi+çıktı.
3. **Proje hedefi çöz:**
   - `projectName` verildi → kullanıcının projelerinde büyük/küçük-harf duyarsız isim eşleşmesi ara. Tam 1 → `{existingId}`. Yok → `{newName: projectName}`. Birden çok → `{ needsProjectChoice: true, candidates: [{id,name}] }`.
   - `projectName` yok → kullanıcının proje sayısı. 0 → `{newName: null}` (kart isim isteyecek). 1 → `{existingId}`. ≥2 → `{ needsProjectChoice: true, candidates }`.
4. **Plan limiti ön-kontrol** — `checkPlanLimit(userId, 'scenarios')` (yalnız oku). Aşıldı → `{ blocked: 'plan_limit', reason }` (kart gösterilmez, Akif sözlü söyler).
5. Çağıranın stale/consumed `AkifPendingAction` satırlarını sil.
6. Bir `AkifPendingAction` yaz (`kind:'save_scenario'`, `payload`, `sessionId` = tool-call gövdesinden).
7. Dön: `{ pendingActionId, confirmCard: {...display + projectRef + editableName flags}, needsProjectChoice?, blocked? }`.

`needsProjectChoice` durumunda `pendingActionId` YİNE üretilir; payload `projectRef: { newName: null }` bırakılır. Kart bir radio listesi (`candidates: [{id,name}]`) gösterir; kullanıcı seçince "Kaydet" commit'e `overrides.projectId` olarak seçilen id'yi gönderir. Kullanıcı listede yeni bir ad da yazabilir → `overrides.projectName`. (Alternatif: `pendingActionId` üretme, Akif sözlü sorsun sonra tekrar `prepareScenarioSave` — daha çok tur, reddedildi.)

Ses tool route bunu `logVoiceTurn` (tool = `prepareScenarioSave`) ile denetler.

## 6. Commit yolu

İki giriş, tek sunucu fonksiyonu — yeni `src/lib/ai/akif/voice/pendingAction.ts`:

```ts
export async function commitPendingAction(
  db: PendingActionDb,
  input: {
    pendingActionId: string
    userId: string
    sessionId: string
    overrides?: { projectName?: string; projectId?: string; scenarioName?: string }
  },
): Promise<
  | { ok: true; scenarioId: string; projectId: string; projectName: string; undoToken: string; undoUntil: string }
  | { ok: false; reason: 'unknown' | 'forbidden' | 'already_consumed' | 'expired' | 'plan_limit' | 'needs_project_name'; message: string }
>
```

- Satırı yükle: yok → `unknown`; `userId` uyuşmaz → `forbidden`; `sessionId` uyuşmaz → `forbidden`; `consumedAt != null` → `already_consumed`; `createdAt` 5dk'dan eski → `expired`.
- **Plan limitini YENİDEN kontrol** (`prepare`'dan bu yana değişmiş olabilir) → `plan_limit`.
- Proje çöz:
  - `overrides.projectId` → kullanıcının mu doğrula → yoksa `forbidden`.
  - `overrides.projectName` ya da `payload.projectRef.newName` → isim (trim) boşsa `needs_project_name`; değilse `prisma.project.create` (nested `scenarios.create` ile — `POST /api/projects` deseni).
  - `payload.projectRef.existingId` → hâlâ kullanıcının mu doğrula.
- Yeni proje DEĞİLSE: `prisma.scenario.create({ data: { projectId, ...map(payload.engineInput, payload.engineOutput) } })`.
- Alan haritası (hepsi `payload`'tan — commit yeniden hesaplamaz): `name` = `overrides.scenarioName ?? payload.scenarioName`; `landShareRatio` = `payload.engineInput.x`; `luxLevel` = `payload.engineInput.luxLevel`; `apartmentSize`, `arsaAlani`, `totalApartments` `payload.engineInput`'tan; `riskLevel: 0`; `builderProfit` = `payload.engineInput` K; `iksaMode: 'off'`, `iksaPercentage: 0`, `iksaManualTL: 0`, `marketPrice: 0`; `fdTotal/fdPerM2/mi/ma/totalCost/fa/fabirim/sdx` = `payload.engineOutput`'tan (motordaki gerçek alan adları plan aşamasında doğrulanır).
- `consumedAt = now`, `undoToken = crypto.randomUUID()`, `undoUntil = now + 30s`, `createdScenarioId`, `createdProjectId` (yalnız yeni proje).
- Dön.

**Giriş 1 — buton:** `POST /api/akif/voice/action/commit` — auth (401) → rate-limit (`AKIF_TURN`, 429) → gövde `{ pendingActionId, sessionId, projectName?, projectId?, scenarioName? }` → `commitPendingAction` → 200 JSON; tipli hata → **409** `{ error: reason, message }`.

**Giriş 2 — sesli "evet":** yeni `commitPendingAction` **tool** (yalnız ses yolu), args `{ pendingActionId }` (override YOK — ses alan düzenleyemez, yalnız gösterileni onaylar) → aynı sunucu fonksiyonu → `ToolResultCard`-benzeri sonuç Akif geri-okur ("kaydettim, X projesine eklendi"). Tarayıcı bunu tool-sonuç akışıyla alır, kartı "kaydedildi + geri al" durumuna çevirir.

**Model prompt:** Akif commit'in gerçekleştiğini `commitPendingAction` başarısını GÖRMEDEN iddia etmez.

## 7. Undo

`POST /api/akif/voice/action/undo` — auth → rate-limit → gövde `{ undoToken }`:
- `AkifPendingAction`'ı `undoToken` (unique) ile yükle. Yok / `userId` uyuşmaz / `undoUntil` geçmiş → 409 `{ reason }`.
- `createdScenarioId` `Scenario`'yu sil.
- `createdProjectId` set VE projede artık 0 `Scenario` VE 0 `StudioScenario` → projeyi de sil.
- `undoToken`'ı null'la (tek-kullanım).
- Dön: `{ ok: true, undid: { scenario: true, project: boolean } }`.

Sesli undo tool'u YOK — yalnız toast/kart butonu.

## 8. İstemci

**Yeni `AkifActionConfirmCard.tsx`** (`src/components/akif/voice/`), `AkifVoicePanel` tarafından kontrollerin üstünde, hook bir pending action verince render edilir:
- **Öneri durumu:** hedef proje (yeni → text input / mevcut → düz etiket / `needsProjectChoice` → küçük radio liste); senaryo-adı text input; salt-okunur olgu bloğu — `Arsa payı %X · Sahibine N daire · Y ₺ · Toplam maliyet Z ₺ · Satış W ₺`. Butonlar: **Kaydet** (primary) / **Vazgeç**.
- **Kaydedildi durumu:** "✓ <proje> projesine kaydedildi" + **Geri Al** butonu (`undoUntil` sonrası disabled).
- **Hata durumu:** tipli hata nedeni düz Türkçe ("Bu ayki senaryo hakkın dolmuş", "Süre doldu, tekrar söyle").

**`useRealtimeVoice` eklemeleri:**
- Dönüşe `pendingAction: { id, card, phase: 'proposal'|'saving'|'saved'|'error', undoToken?, undoUntil?, errorMessage? } | null`.
- `voiceEvents.ts` / `voiceToolBridge.ts`: `prepareScenarioSave` ve `commitPendingAction` tool sonuçlarını tanı → `pendingAction` state kur (sıradan `ToolResultCard` `attachCard` yolundan ayrı branch).
- Hook metotları: `confirmPendingAction(overrides)`, `cancelPendingAction()`, `undoLastAction()` — kart butonları çağırır; `sessionIdRef.current` ile `/action/*` route'larına POST eder; Realtime'a kısa system mesajı besler (`safeSend` `conversation.item.create`) — "kullanıcı kaydı onayladı" / "kullanıcı vazgeçti" / "geri alındı".
- **Reconnect etkileşimi:** commit EDİLMEMİŞ pending action reconnect'te **düşer** (`resumeContextRef` notu: "önceki kaydetme önerisi iptal oldu, gerekiyorsa tekrar sor"). Commit edilmiş + geri-alınabilir olan da düşer (toast geçici). Basit tutulur.

**Realtime prompt** (`voiceRhythm.ts` ya da session config'e ek): Akif kaydetmeyi yalnız bir karşılaştırma varsa önerir; "kaydet"te `prepareScenarioSave` çağırır; `commitPendingAction` başarısı görmeden kayıt olduğunu iddia ETMEZ; `needsProjectChoice`'ta hangi proje diye sorar; onaydan önce kartın sayılarını sesli okur.

## 9. Test stratejisi

### Birim (jest — gerçek, API'siz)

- **`scenarioEngine.test.ts`** — `computeFullScenario` tam girdi+çıktı döner; `buildScenarioEngineInput` eski private `baseInput` ile aynı (bilinen arg seti için `CalculationInput` snapshot'ı); compare tool'ları aynı `ScenarioRow`'ları üretir (regresyon).
- **`prepareScenarioSave.test.ts`** — validation (kötü %, aralık dışı); proje çözümleme (isim eşleşme → existingId; eşleşmeme → newName; 0 proje → newName:null; ≥2 → needsProjectChoice); plan-limit ön-kontrol → `blocked`; tam bir `AkifPendingAction` yazar; stale-satır sweep.
- **`pendingAction.test.ts`** — `commitPendingAction`: happy (mevcut proje), happy (yeni proje, nested create), overrides uygulanır, plan-limit yeniden-kontrol başarısız, expired/consumed/wrong-session/wrong-user tipli hatalar, `undoToken`/`undoUntil` set. Undo mantığı: senaryo siler; proje YALNIZ oluşturduğunda + başka senaryo/studio yoksa siler; `undoUntil` geçti → reddet; tek-kullanım.
- **route testleri** `/api/akif/voice/action/{commit,undo}` + `/api/akif/voice/tool`'da `commitPendingAction`/`prepareScenarioSave` tool'ları — auth 401, rate-limit 429, tipli hata → 409, happy → 200.
- **`toolRegistry` genişletmeleri** — `validateArgs`/`dispatchTool` iki yeni tool; `AKIF_TOOL_DEFS` girdileri; ses route `TOOL_NAMES` ikisini içerir; Akif-1 metin yolu İÇERMEZ (`/api/akif/turn` regresyon).
- **`AkifActionConfirmCard.test.tsx`** — öneri olguları render; Kaydet → `confirmPendingAction`; yeni-proje adı zorunlu; kaydedildi → Geri Al; `undoUntil` sonrası disabled.
- **`useRealtimeVoice.test.tsx`** — `prepareScenarioSave` tool sonucu `pendingAction` kurar; `confirmPendingAction` commit POST'lar + system mesajı besler; reconnect pending action'ı düşürür.

### Regresyon

Akif-1 + Akif-2 + Akif-2.1 süitleri tam yeşil; `Scenario`/`Project`/`checkPlanLimit` yalnız yeni çağrıcıyla dokunulur. Her SDD task'ında `tsc` 0 + jest + `npm run build`.

### İnsan dumanı (`docs/akif/akif-2-insan-duman-kontrol-listesi.md`'ye eklenir)

- Sesli "bunu kaydet" → kart doğru sayılarla → Kaydet → proje sayfasında görünür → Geri Al kaldırır
- Yanlış duyulan % kartta yakalanır (kullanıcı Vazgeç der)
- Sesle yeni proje: 0 proje → Akif ad sorar → kartta ad → Kaydet → proje + senaryo oluşur
- Sesli "evet" ile commit (buton yerine)
- Plan limiti dolu → Akif sözlü söyler, kart çıkmaz

## 10. Deploy kapısı (Akif-2 §9 + Akif-2.1 §9'a EKLENİR)

- Migration `<ts>_add_akif_pending_action` prod'a `prisma migrate deploy` (bağımsız tablo)
- Yeni env YOK
- İnsan dumanı: yukarıdaki 5 madde
- (Not: Realtime prompt değişikliği — `akif:voice-smoke` yeni tool şemalarının Realtime tarafından reddedilmediğini de kontrol etmeli)

## 11. Bilinen v1 kalıntıları / açık kararlar

- Commit'te yeni proje oluşturulup sonra `Scenario.create` ayrı adımsa ve ikincisi düşerse → yetim proje. **Karar:** yeni proje her zaman nested `project.create({ data: { ..., scenarios: { create } } })` ile tek işlemde — yetim imkânsız. Mevcut projeye ekleme ayrı `scenario.create` (yetim riski yok).
- `AkifPendingAction` bayat satırları yalnız çağıranın sonraki `prepareScenarioSave`'inde temizlenir (küçük, indeksli tablo).
- `needsProjectChoice` + `overrides` akışı: kart radio seçimi commit'e `projectName` olarak gider, commit yeniden isim-çözümler — nadir "aynı isimli 2 proje" durumunda ilkini alır (kabul; kullanıcı sonra düzeltir).
- Sesli "evet" commit'i: model yanlışlıkla "evet" derse (kullanıcı dememişken) commit olur — mitigasyon: `pendingActionId` bu oturumda gerçek `prepareScenarioSave`'den gelmeli + tek-kullanım + 30sn undo toast + `low` risk. Yazılı/sözlü teyit cümlesi `high`-risk aksiyonlara saklandı.
- Reconnect commit edilmemiş pending action'ı düşürür — kullanıcı reconnect anında "kaydet" demiş olsa bile tekrar demeli (kabul; nadir).
- `undoUntil` sunucu saati; istemci disabled'ı yaklaşık (kabul — sunucu yine 409 verir).
