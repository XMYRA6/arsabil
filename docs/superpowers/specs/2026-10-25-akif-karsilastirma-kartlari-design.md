# Akif: Önerili Karşılaştırma Kartları (sesli + metin) — Tasarım

Tarih: 2026-10-25 · Durum: onay bekliyor (kullanıcı kapsamı sözlü onayladı)

## Amaç ve neden

Kullanıcı Akif ile sesli konuşurken karşılıklı diyalog yazıya dökülsün; Akif cevabını hem sesle hem ekranda versin; gerektiğinde **tablo halinde kıyas** ve **öneri** sunsun. Hype etkisi: kullanıcı konuşuyor, ekranda anında düzgün bir tablo beliriyor ve Akif "üçünü ekrana koydum, bence B" diyor.

Kullanıcının kararları:
- Tablo varsa Akif **sesli olarak özet geçer**, ekrana bakılabileceği için satır satır okumaz.
- Müşteri isterse satır satır anlatır, isterse yorumlar.
- Kıyas konuları: **arsa–arsa, müteahhit teklifleri, olası senaryolar** (hepsi).
- Şimdilik ses modeli, avatar, mizahlı anlatım **kapsam dışı** (ileride ayrı iş).

## Mevcut durum (kodda zaten var, dokunulmayacak)

- Sesli oturum: OpenAI Realtime (`src/components/akif/voice/useRealtimeVoice.ts`), iki yönlü canlı transkript (`AkifVoiceTranscript`), araç sonucu kartları transkripte girer (`attachCard`).
- Sesli araçlar (`src/app/api/akif/voice/tool/route.ts` allowlist): `explainTerm`, `compareContractorOffers`, `compareApartmentSizes`, `prepareScenarioSave`, `commitPendingAction`. Kıyas sonuçları `ScenarioCard` olarak tablo render edilir (`AkifScenarioCard`).
- Ses prompt'u (`voiceRhythm.ts`): "2–3 cümle, ayrıntıyı sorarsa aç", "kafadan aritmetik yok, her sayı araçtan".
- `lookupParcel` (ada/parsel → `ParcelCard`) yalnız WhatsApp gateway'inde; sesli/web allowlist'inde YOK.

## Hedefler

1. **Sesli oturumda arsa kıyası.** Yeni araç: 2–4 arsayı (il/ilçe/mahalle/ada/parsel) mevcut `lookupParcel` + `buildDegerCard` motoruyla çözer, yan yana bir kıyas kartı üretir. Sayılar yalnız motordan gelir.
2. **Önerili kart.** Her kıyas kartı (arsa kıyası, müteahhit payı, daire büyüklüğü/senaryolar) isteğe bağlı bir "Akif'in önerisi" alanı taşır: önerilen satır vurgulanır, altında 1–2 cümle gerekçe. Öneri, araç çıktısından deterministik bir kuralla seçilir (modelin uydurması değil); kural kart tipine göre tanımlanır ve kartta görünür ("neye göre": ör. en yüksek arsa sahibi değeri).
3. **Konuşma kuralı.** Prompt'a (sesli ve metin Akif) açık kural: kıyas kartı ekrana düştüyse sesli/sözlü cevap yalnız özet + öneri; kullanıcı "anlat/oku" derse satır satır; "sence/yorumla" derse yorum yapar. Kafadan sayı yasağı aynen korunur.
4. **Metin sohbetinde aynı kartlar** aynı bileşenlerle görünür (paylaşılan toolRegistry/kart bileşenleri).

## Hedef dışı

- Ses modeli, ses, avatar, mizah/persona değişikliği.
- WhatsApp tarafında yeni özellik (WhatsApp mevcut halinde kalır).
- Yeni araç sınıfları dışında yeni veri kaynağı; fiyat/değer yalnız mevcut `buildDegerCard` motorundan.
- Transkript dışa aktarma/kaydetme (istenmedi).

## Anti-hedefler (başarısızlık sayılır)

- Tabloda veya Akif'in konuşmasında motordan gelmeyen bir sayı.
- Kart ekrandayken Akif'in tüm tabloyu sesli okuması (kullanıcı istemedikçe).
- "Öneri"nin gerekçesiz veya kartla çelişkili olması.
- Mevcut senaryo/kayıt (`prepareScenarioSave`) akışının bozulması.

## Kısıtlar

- Stack: Next.js + TS, mevcut `ToolResultCard` birleşimi genişletilir (`src/lib/ai/akif/contract.ts`), yeni kart tipi eklenirse hem `AkifVoiceTranscript` hem metin sohbeti render eder.
- Araç allowlist'i dışına çıkılmaz; yeni araç `toolRegistry.ts` + `voice/tool/route.ts` allowlist'ine açıkça eklenir, argüman doğrulaması (`validateArgs`) zorunlu.
- Maliyet/kota korumaları (`costGuard`, `voiceQuota`) aynen geçerli; yeni araç ek model çağrısı yapmaz.
- Test-first (mevcut jest/RTL düzeni); mobil 390px'te tablo yatay kaydırmayla okunur kalır.

## Builder'a bırakılanlar

- Kıyas kartının tam bileşen yapısı (tek genel `ComparisonCard` mi, tip başına kart mı) ve CSS.
- Her kart tipi için önerinin deterministik kuralının ayrıntısı (kullanıcı onayına sunulacak varsayılanlar: arsa kıyası → birim m² değeri/imar avantajı bileşimi ya da motorun kendi skoru varsa o; müteahhit payı → arsa sahibi değeri en yüksek satır; daire büyüklüğü → arsa sahibi daire sayısı/değerinin dengesi).
- Arsa kıyası aracının girdi şeması (dizi uzunluğu 2–4) ve belirsiz konum durumları (`ambiguous`, `parcel_not_found`) için kullanıcıya dönüş biçimi — mevcut `ParcelCard.status` anlamları korunur.

## Teslimat

Uygulama: subagent-driven-development ile, task başına review. Ardından kod review ve VPS'e dağıtım. **Not:** VPS/prod adımı (ArsaBil için) daha önce token/SSH engeliyle ertelenmişti; dağıtım öncesi erişim doğrulanacak ve dağıtım kullanıcı onayıyla yapılacak. Dal: `gorsel-yenileme-arazi` push edilmemiş ve çalışma ağacında ilgisiz değişiklikler var; kod işine temiz bir worktree'de başlanacak.

## Builder-check sonrası kararlar (benim kararlarım — kullanıcı gözden geçirecek)

- **Araç kaydı:** `lookupParcel.ts` başlığındaki "toolRegistry'ye eklenmez" notu bilinçli olarak tersine çevrilir; yeni kıyas aracı web/sesli allowlist'e girer. WhatsApp politikası (`akifToolPolicy`) açık dışlama ile değişmeden kalır. Konum çözümleme/kart üretim bağımlılıkları WhatsApp'taki wiring'den yeniden kullanılır; yeni veri kaynağı sayılmaz.
- **Çok parsel hataları:** Parseller paralel çözülür. Kısmi başarıda başarılı satırlar tabloda gösterilir, başarısız parsel için satır içi durum (`ambiguous` / `parcel_not_found` / `parcel_unavailable`) yazılır; Akif belirsiz olanı kullanıcıya sorar. En az 2 başarılı parsel yoksa öneri üretilmez.
- **Öneri kuralı:** Eksik/ince veri (`insufficientData`, `thinData`) veya farklı `basis` seviyeleri (mahalle/ilçe/il karışımı) varsa öneri verilmez, kartta "doğrudan kıyaslanamaz" notu çıkar. Beraberlikte öneri verilmez. Müteahhit/daire kartlarında öneri, motor çıktısından kural ile (ör. en yüksek arsa sahibi değeri) seçilir ve kartta "neye göre" yazılır. Parsel kıyasında birincil ölçüt m² birim değeridir; toplam değerle farklı kazananlar çıkarsa ikisi de kartta gösterilir ve öneri birim değere göredir (varsayım).
- **Kayıt akışı:** Öneri yalnız ekranda gösterilir (display-only); `prepareScenarioSave` ve kayıtlı senaryo şeması değişmez. "Olası senaryolar" = mevcut `contractor_offers` ve `apartment_sizes` kartları; üçüncü yeni kart tipi yoktur.
- **Konuşma kuralı mekanizması:** Kural tek bir paylaşılan prompt parçasında tutulur (sesli ve metin Akif ikisi de kullanır) ve araç sonucuna "kart ekranda gösterildi, satırları okuma; yalnız özet+öneri" ipucu eklenir. Test: prompt metni birim testleri + araç çıktısı sözleşmesi testi; gerçek ses davranışı elle smoke.

## Erişim ve kota kararı (kullanıcı)

- İlke: **özet herkese açık, detay üyelere.** Parsel kıyas kartı: herkes aralık (kaba) tablosunu görür; kesin tahmin, m² birim değeri ve **Akif'in önerisi** yalnız üyede görünür. Ücretsiz kullanıcıda öneri yerine üyelik daveti çıkar; ücretli veri sızdırılmaz.
- Kota modeli (ürün kararı, kullanıcıdan): WhatsApp'ta kayıtsız numara 1 sorgu, WhatsApp API doğrulamasıyla üye olunca 5 ücretsiz sorgu, premium ~100 sorgu (sınırsız değil, bütçe nedeniyle; fiyat sonra belirlenecek). Bu iş WhatsApp'a dokunmaz; mevcut kota/plan altyapısı (`checkPlanLimit`) neyi nasıl sayıyorsa yeni kıyas aracı ona uyar. Builder: 1 kıyas çağrısının kotadan kaç sorgu düşeceğini mevcut sayaç yapısına bakarak belirler (varsayılan: parsel başına 1 sorgu) ve spec'e not düşer.
- Müteahhit/daire senaryo kartları parsel değer verisi içermediği için bu ayrımdan etkilenmez (mevcut davranış).
