# Agent Handoff — Arsabil Studio Faz 4B

**DOĞRULANDI (2026-08-22, ikinci geçiş):** Faz 4A gerçekten tamam —
kod, testler (875/875 yeşil), `tsc`, `npm run build` VE veritabanı
migration'ı (`StudioScenario`/`StudioScenarioVersion`/`StudioScenarioAuditLog`
tabloları local dev DB'de gerçekten var, `prisma migrate status` "up to
date"). İki gerçek sorun bulunup düzeltildi: `totalAllocatedAreaM2` hep
0 dönen bir alan-adı bugı, ve bellek-içi (kalıcı olmayan) audit log artık
`StudioScenarioAuditLog` tablosuna yazıyor. Detay: Faz 4A plan dosyasının
sonundaki "Gap Fix" bölümü. Bunları TEKRAR DOĞRULAMANA gerek yok, direkt
Faz 4B Task 1'den başlayabilirsin.

**ÖNCE Faz 4A tamamlanmış olmalı.** Bu planın kendi başlığı: "Faz 4A
kalıcı, versioned scenario modelinden sonra uygulanır." `StudioScenarioVersion`
modeli (Faz 4A Task 1) yoksa bu fazın Task 1'i (proposal view model) bile
inşa edilecek veri kaynağından yoksun kalır. `EXECUTION-QUEUE.md`de Faz
4A "Completed" listesine girmeden bu planı dispatch etme.

Bu dosya, Faz 4A'yı tamamlayan modelin **sıradaki** işi içindir. **ÖNCE
`AGENT-HANDOFF-FAZ3B.md`yi (genel dersler) ve `AGENT-HANDOFF-FAZ4A.md`yi
(DB/auth/migration dersleri, hâlâ geçerli) oku.** Bu dosya yalnızca Faz
4B'ye özgü ek bilgiyi içerir.

## Plan durumu

- **Plan:** `2026-08-19-arsabil-studio-faz4b-teklif-raporu-ve-guvenli-paylasim.md`
  — zaten yazılmış (2026-08-19), 6 task. Yeniden yazmana gerek yok.
- **Implementasyon durumu: %0.** Hiçbir dosyası yok.

## Faz 4B Ne Yapıyor (özet)

Faz 4A'nın kalıcı `StudioScenarioVersion`ını (1) okunur bir "proposal view
model"e (2) görsel önizleme/thumbnail'e (3) PDF raporuna (4) süresi
dolabilen, geri alınabilir bir paylaşım linkine çevirir. **Hesaplama
YAPMAZ** — yalnızca zaten hesaplanmış, kaydedilmiş bir versiyonu okur ve
sunar (Global Constraint: "rapor/paylaşım sayfası hesaplama yapmaz").

## Faz 4B'ye Özgü Riskler

### 1. Mevcut `CompareShare` deseni KISMİ bir referans — birebir kopyalama

Task 4 bullet 5 diyor ki: "Eğer mevcut compare share altyapısı uygunsa,
token policy'sini aynılaştır; kopya auth mantığı yazma." Kontrol ettim —
`src/app/api/compare/share/route.ts` ve `src/app/api/compare/[token]/route.ts`
gerçekten var ve şu deseni kullanıyor:

```ts
// Olusturma (auth'lu): getServerSession -> owner dogrula -> prisma.compareShare.create({data:{userId, ...}, select:{token:true}})
// Okuma (public, auth YOK): prisma.compareShare.findUnique({where:{token}}) -> 404 yoksa
```

**AMA** `CompareShare` Prisma modelinde (`prisma/schema.prisma`) `expiresAt`
veya `revoked` alanı YOK — sadece `id, token, userId, scenarioIds, createdAt`.
Faz 4B'nin Task 4'ü "expiration, revoke ve owner kontrolu" istiyor —
bunlar `CompareShare`de HAZIR DEĞİL. İki seçenek: (a) yeni bir
`StudioShareToken` modeli (kendi `expiresAt`/`revokedAt` alanlarıyla) ekle,
(b) `CompareShare`i genişlet (riskli — ana hesap makinesinin paylaşım
özelliğini etkiler, YAPMA). **(a)'yı tercih et** — mevcut, çalışan
`CompareShare`i değiştirme, yanına yeni bir model ekle. Sadece AUTH/route
İSKELETİNİ (yukarıdaki iki kod bloğu) örnek al, veri modelini değil.

### 2. PDF entegrasyonu — ikinci hesap yolu YAZMA

Task 3: "PDF'e aynı `StudioProposalViewModel` ile opsiyonel Studio bölümü
ekle; ikinci hesaplama yolu yazma." Mevcut PDF akışı `src/lib/pdf/`
altında (`report_generator.ts` gibi, bu oturumda daha önce
`@react-pdf/renderer` kullanıldığı görüldü). Studio bölümünü EKLE, mevcut
`Mi/Ma/M/K/FD` hesap akışını KOPYALAMA veya YENİDEN YAZMA — yalnızca
`StudioProposalViewModel`in zaten hesaplanmış alanlarını render et.

### 3. Sunucu WebGL çalıştırmaz — Task 2'yi buna göre tasarla

"Sunucu WebGL calistirmaz" (Architecture notu). 3D thumbnail üretimi
İSTEMCİ TARAFINDA (canvas.toDataURL() gibi) yapılmalı, sunucuda
puppeteer/headless-browser ile 3D render YOK. 2D SVG için server-side
serialize daha kolay (zaten vektör/metin).

### 4. Global Constraint — dil ve gizlilik kuralları literal

- "Hukuki sözleşme, resmi imar onayı veya garantili getiri iddia etmez" —
  Faz 2B'de kurulan aynı "ön teklif/senaryo" dili kuralı (bkz.
  `LandownerOfferPanel.tsx`'teki sabit not) burada da geçerli.
- "Ham kullanıcı notu, internal audit verisi veya diğer senaryolar
  varsayılan olarak paylaşılmaz" — opt-in olmalı, opt-out değil.

## Bittiğinde

`AGENT-HANDOFF-FAZ3B.md`nin "Bittiğinde Ne Yapmalı" bölümündeki 5 adımı
uygula. Faz 4B, execution-sequence.md'ye göre Slice 6'nın son parçası —
bittiğinde sıradaki Slice 7 (Faz 5/5A/5B, AR/iç mimari/marketplace karar
kapısı) "gerçek kanıt olmadan başlatılmaz" diyor (execution-sequence.md,
"Do Not Skip"); kullanıcıya sormadan o yöne geçme.
