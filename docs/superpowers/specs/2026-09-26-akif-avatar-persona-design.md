# Alt-proje: Akif — Avatar / Persona Sistemi (Akif-4a) tasarımı

**Tarih:** 2026-09-26
**Branch:** `codex/professional-ui-and-land-cost` (HEAD `cdacb72`)
**Üst bağlam:** `docs/arsabil-ai-akif-product-vision-v1.1.md`, `docs/superpowers/specs/2026-09-15-akif-3-arsa-dosyasi-design.md`. [[project_arsabil]], [[project_arsabil_edermi_rakip]] (Akif = "alt-proje 4").

## 0. Akif-4 dekompozisyonu (2026-09-26, onaylı)

Kullanıcı Akif-4'ü ("avatar + gerçek özel ses") tek başlık olmaktan çıkarıp, ayrıca yeni bir "sesli aksiyon genişlemesi" isteği getirdi. Üçe bölündü, sıra onaylandı: **A → B → C**.

| Alt-proje | Kapsam | Durum |
|---|---|---|
| Akif-1..3, 5 | (bkz. önceki spec'ler) | **BİTTİ** (push/deploy hariç) |
| **Akif-4a (bu spec)** | **Avatar/Persona sistemi** — 3 sabit persona, sadece yorum tonu/bakış açısı değişir, motor/araçlar aynı. Metin (`/akif`) tarafı, web-only. | YAZILIYOR |
| Akif-4b | Gerçek özel/lisanslı ses (Laz aksanlı TTS/klon) — sağlayıcı henüz seçilmedi | Akif-4a'dan sonra |
| Akif-4c | Sesli aksiyon genişlemesi — ilan açma, harita/TKGM parsel seçtirme, rapor anlatımı (Akif-2-Aksiyon'un kapsamını büyütür) | Akif-4b'den sonra |

## 1. Amaç, kapsam, onaylanan kararlar

**Amaç:** Bugün Akif tek bir sabit karakter (Karadeniz müteahhit "Akif Usta"). Kullanıcı aynı hesap/senaryo verisine farklı profesyonel bakış açılarından ("emlak piyasası analisti", "yatırımcı") yorum alabilmek istiyor — sayılar hep aynı deterministik motordan gelir, sadece anlatım/vurgu değişir.

### Onaylanan kararlar (2026-09-26 brainstorming)

- **Seçim modeli: konuşma başında sabit.** Proje seçici gibi davranmaz — proje seçici konuşma ortasında değiştirilebiliyor (Akif-3), avatar seçici **DEĞİŞTİRİLEMEZ** olmalı; değiştirmek için "Yeni sohbet" gerekir. Gerekçe: bir avatarın "sesiyle" başlayan bir konuşmanın ortasında karakter değişmesi tutarsız/kafa karıştırıcı olur.
- **Fark kapsamı: sadece ton/yorum tarzı.** Üç avatar da aynı `toolRegistry`'yi, aynı `CalculatorEngineV2` çıktısını kullanır. Hiçbir avatar farklı veri/araç görmez, farklı alan vurgulamaz — bu, Akif'in "model sayı uyduramaz, hesap her zaman gerçek motordan gelir" temel kuralını korur ve orchestrator'a koşullu dallanma eklemekten kaçınır (YAGNI).
- **Kanal kapsamı: sadece web `/akif` (metin).** WhatsApp (Akif-5) her zaman `muteahhit` varsayılanını kullanmaya devam eder — WhatsApp'ın kendi durum makinesine persona seçim adımı eklemek bu round'un kapsamı dışında.
- **Hafıza (Akif-3 Arsa Dosyası): paylaşılan, avatara bağlı değil.** `Project.akifMemory` projeye aittir, kim yorumlarsa yorumlasın aynı öğrenilmiş-gerçek kümesi kullanılır.
- **Persona kimlikleri:**
  - `muteahhit` (**varsayılan**, mevcut karakterin birebir devamı) — görünen ad **"Laz Müteahhit Akif AI"**, mevcut `PERSONA_PROMPT` metni AYNEN korunur (regresyon: bugünkü davranış hiç değişmez).
  - `piyasa` — görünen ad **"Emlak Piyasası"** — emsal, fiyat trendi, arz/talep dengesine odaklı, daha analitik/mesafeli ton.
  - `yatirimci` — görünen ad **"Yatırımcı"** — getiri, likidite, geri dönüş süresi odaklı, daha risk-iştahlı ton.

### Kapsam DIŞI (Akif-4a v1)

- Sesli modda (Akif-2/2-Aksiyon) avatar seçimi — yalnız metin turu (`/api/akif/turn`, `/akif` text UI)
- WhatsApp'ta (Akif-5) persona seçimi
- Avatar başına farklı araç/veri vurgusu (hepsi aynı `toolRegistry`'yi görür)
- Avatar başına ayrı hafıza (Akif-3 dosyası paylaşılan kalır)
- Yeni/özel TTS sesi (Akif-4b'nin konusu)
- Üç avatarın aynı anda karşılaştırmalı yanıt vermesi (kullanıcı bunu reddetti — maliyet + karmaşıklık)

## 2. Mimari — genel bakış

```
TARAYICI (/akif metin sohbeti)
  Kullanıcı avatar seçer (konuşma boşken, segmented control)
  → konuşma başlayınca (entries.length > 0) seçici DISABLED
        │
        ▼  POST /api/akif/turn  { conversationId, history, userMessage, projectId?, avatarId? }
  route.ts
    avatarId gövdede varsa VE AKIF_AVATARS'ta tanımlıysa kullan, aksi halde
    sessizce yok say (undefined) → runAkifTurn varsayılana düşer
    (projectId'nin "sessizce yok say" felsefesiyle tutarlı — 400 YOK)
        │
        ▼
  runAkifTurn(..., { avatarId })
    assembleSystemPrompt({ ..., avatarId })
      → AKIF_AVATARS[avatarId ?? 'muteahhit'].promptFragment LAYERS[0] olarak kullanılır
      → geri kalan 6 katman + Arsa Dosyası + extraSystemPrompt AYNEN
        │
        ▼
  Response: AkifTurn (avatarId turn şemasına HİÇ girmez — bu bir görüntü/anlatım
            tercihi, modelin yapılandırılmış çıktısının bir parçası değil)
```

## 3. Veri modeli

**Yok.** Avatar seçimi kalıcı bir varlık değil — sabit kodlu bir kayıt (`AKIF_AVATARS`), istemci state'inde tutulur, her istekte gönderilir. Migration yok, yeni Prisma modeli yok.

## 4. Sözleşme + prompt değişiklikleri

### 4.1 Yeni `src/lib/ai/akif/prompts/avatars.ts`

```ts
export type AkifAvatarId = 'muteahhit' | 'piyasa' | 'yatirimci'

export interface AkifAvatar {
  id: AkifAvatarId
  displayName: string
  tagline: string
  promptFragment: string
}

export const DEFAULT_AKIF_AVATAR_ID: AkifAvatarId = 'muteahhit'

export const AKIF_AVATARS: Record<AkifAvatarId, AkifAvatar> = {
  muteahhit: {
    id: 'muteahhit',
    displayName: 'Laz Müteahhit Akif AI',
    tagline: 'İnşaat maliyeti ve riske müteahhit gözüyle bakar.',
    promptFragment: PERSONA_PROMPT, // persona.ts'ten AYNEN, değişmedi
  },
  piyasa: {
    id: 'piyasa',
    displayName: 'Emlak Piyasası',
    tagline: 'Emsal, fiyat trendi ve arz/talep dengesine analist gözüyle bakar.',
    promptFragment: PIYASA_PERSONA_PROMPT, // yeni
  },
  yatirimci: {
    id: 'yatirimci',
    displayName: 'Yatırımcı',
    tagline: 'Getiri, likidite ve geri dönüş süresine yatırımcı gözüyle bakar.',
    promptFragment: YATIRIMCI_PERSONA_PROMPT, // yeni
  },
}

export function isAkifAvatarId(v: unknown): v is AkifAvatarId {
  return typeof v === 'string' && v in AKIF_AVATARS
}
```

`persona.ts` **DOKUNULMAZ** (`PERSONA_PROMPT` aynen kalır, `avatars.ts` onu import edip `muteahhit` girdisine koyar) — mevcut `prompts.test.ts`'teki `PERSONA_PROMPT` importları ve "7 parçayı sabit sırayla birleştirir" testi hiç bozulmaz.

**Yeni iki prompt metni** (`piyasa`, `yatırımcı`) `persona.ts`'teki mevcut kalıba uyar: karakter tanımı + konuşma tarzı + "sen bir chatbot değilsin" kapanışı. Uzunluk/ton mevcut `PERSONA_PROMPT` ile kıyaslanabilir olmalı (`trim().length > 80` testi geçecek şekilde, pratikte çok daha uzun olacak). İçerik implementasyon sırasında (Task içinde) yazılır — bu spec sadece yapıyı ve kısıtları sabitliyor: **hiçbir avatar metni "araçları kullan/sayı uydurma" kuralını yumuşatamaz** (bu kural zaten ayrı katmanlarda — `TOOL_POLICY_PROMPT`/`SAFETY_POLICY_PROMPT` — persona katmanına asla taşınmaz).

### 4.2 `assemble.ts` — `PromptContext` genişlemesi

```ts
export interface PromptContext {
  hasHistory: boolean
  projectMemory?: string | null
  extraSystemPrompt?: string
  avatarId?: AkifAvatarId   // yeni
}

export function assembleSystemPrompt(ctx: PromptContext): string {
  const persona = AKIF_AVATARS[ctx.avatarId ?? DEFAULT_AKIF_AVATAR_ID].promptFragment
  const layers = [
    persona,
    DOMAIN_PROMPT,
    CONVERSATION_POLICY_PROMPT,
    TOOL_POLICY_PROMPT,
    SAFETY_POLICY_PROMPT,
    DIALECT_PROMPT,
    HUMOR_PROMPT,
  ]
  const parts = layers.map((layer) => layer.trim())
  // ...geri kalanı (projectMemory/extraSystemPrompt/FIRST_MESSAGE_NOTE) DEĞİŞMEDİ
}
```

`avatarId` verilmezse `persona === PERSONA_PROMPT` (bugünküyle birebir aynı) — mevcut `LAYERS` sabit dizisi kaldırılıp fonksiyon içi `layers` değişkenine alınıyor (tek satırlık iç refactor, dışa görünen davranış avatarId yokken değişmez).

### 4.3 Orchestrator

`RunAkifTurnInput`'a eklenir:

```ts
export interface RunAkifTurnInput {
  // ...mevcut alanlar
  avatarId?: AkifAvatarId
}
```

`assembleSystemPrompt` çağrısına `avatarId` eklenir. Başka hiçbir değişiklik yok (Akif-3'ün `projectMemory` eklemesiyle birebir aynı desen).

## 5. API — `/api/akif/turn`

Gövde doğrulamasına opsiyonel alan:

```ts
const { conversationId, history, userMessage, projectId, avatarId } = body as {
  // ...mevcut
  avatarId?: unknown
}
const validatedAvatarId = isAkifAvatarId(avatarId) ? avatarId : undefined
```

`validatedAvatarId`, `runAkifTurn`'e geçirilir. **Geçersiz/bilinmeyen değer 400 döndürmez** — `projectId`'nin "sessizce yok say" davranışıyla tutarlı, varsayılana düşer. Rate-limit/bütçe/env guard adımları değişmez.

## 6. Frontend — `/akif` sayfası

- Yeni state: `const [avatarId, setAvatarId] = useState<AkifAvatarId>('muteahhit')`.
- `send()` içindeki gövdeye `avatarId` eklenir (her zaman gönderilir, `projectId` gibi koşullu değil — varsayılan da olsa sunucu tarafında kayıt/log netliği için).
- **Segmented control** (3 buton, proje seçicinin yanına/altına) — `AKIF_AVATARS`'ı map'ler, `displayName` gösterir. **`entries.length > 0` iken `disabled`** (konuşma başladıktan sonra değiştirilemez — onaylanan "sabit" kararının UI karşılığı). Sadece `mode === 'text'` iken görünür (sesli mod bu round'da avatar'ı desteklemiyor, §1 kapsam dışı).
- Başlık (`<h1>`) ve alt yazı, seçilen avatarın `displayName`/`tagline`'ını yansıtacak şekilde güncellenir (statik "Akif Usta'ya Sor" yerine `${AKIF_AVATARS[avatarId].displayName}'a Sor`).
- `resetConversation()` avatar seçimini SIFIRLAMAZ (kullanıcı aynı avatarla yeni sohbete devam edebilir) — sadece `entries`/`conversationId` sıfırlanır, mevcut davranış.

## 7. Test / kenar durumları

- **`avatars.test.ts` (yeni):** `AKIF_AVATARS` tam 3 anahtar içerir (`muteahhit`/`piyasa`/`yatirimci`); her `promptFragment` dolu string (`trim().length > 80`); `AKIF_AVATARS.muteahhit.promptFragment === PERSONA_PROMPT` (byte-eşitlik — persona.ts'e dokunulmadığının kilidi); `isAkifAvatarId` geçerli/geçersiz girdilerde doğru boolean döner (`'muteahhit'`→true, `'x'`→false, `undefined`→false, `123`→false).
- **`prompts.test.ts` güncellemesi:** mevcut testler DEĞİŞMEDEN geçmeli (avatarId hiç geçirilmiyor → regresyon kilidi zaten örtük). Yeni `describe('assembleSystemPrompt — avatar (Akif-4a)')`: (a) `avatarId: 'piyasa'` → çıktıda `PIYASA_PERSONA_PROMPT` var, `PERSONA_PROMPT`'un müteahhit-özel cümleleri YOK; (b) `avatarId: 'yatirimci'` → benzer; (c) `avatarId` verilmezse çıktı `avatarId:'muteahhit'` ile birebir aynı; (d) her avatar için "7 parçayı sabit sırayla birleştirir" testinin bir varyantı (persona her zaman ilk katman).
- **`orchestrator.test.ts`:** `avatarId` geçirilmeden çağrılan MEVCUT testler değişmeden geçmeli. Yeni test: `avatarId` geçirilince `assembleSystemPrompt`'a doğru iletiliyor (mock/spy — Akif-3'ün `projectMemory` testiyle birebir aynı desen).
- **`route.test.ts`:** (a) `avatarId` yok → davranış bugünküyle aynı (varsayılan); (b) `avatarId: 'gecersiz'` → 400 DEĞİL, sessizce yok sayılır, varsayılana düşer; (c) `avatarId: 'yatirimci'` → `runAkifTurn`'e doğru değerle iletildiği doğrulanır (mock assert).
- **`page.test.tsx`:** segmented control 3 seçenek render eder; `entries` boşken tıklanabilir, bir mesaj gönderildikten sonra `disabled`; seçili avatara göre başlık metni değişir; `send()` çağrısının gövdesinde `avatarId` alanı var.

## 8. Deploy kapısı

**Yok / minimal.** Yeni migration yok, yeni env yok. Bu değişiklik tamamen additive prompt metni + istemci state'i — mevcut canlı davranışı (avatarId gönderilmediğinde) hiç etkilemiyor, dolayısıyla Akif'in birikmiş deploy listesine yalnızca "yeni prompt dosyaları" olarak eklenir, ayrı bir insan-duman maddesi gerekmez (LLM çıktısının doğal dil kalitesi zaten mevcut Akif-1 eval sürecinin kapsamında — `piyasa`/`yatirimci` promptları için `akif:eval` fixture'larına birkaç yeni senaryo eklenmesi FAYDALI olur ama bu round'u bloklamaz, ayrı bir küçük takip maddesi olarak not düşülür).
