# Agent Handoff — Arsabil Studio Faz 3B

Bu dosya, bu oturumda (Claude/Sonnet) çalışmayı devralacak BAŞKA bir AI
modeli (Codex, Gemini, vb.) için yazıldı. O modelin bu konuşmanın hiçbir
belleği yok — burada anlatılanlar dışında hiçbir şey bilmiyor. Amaç: aynı
disiplinle, aynı hatalara düşmeden devam edebilmesi.

## Proje

- **Repo:** `C:\Users\emre\Desktop\arsabil-main` (Windows, git repo değil —
  `.git` klasörü YOK, bu bilinçli/mevcut bir durum, `git init` ÖNERME).
- **Stack:** Next.js 16 (App Router), React 19, TypeScript, Jest +
  React Testing Library, `@react-three/fiber`/`drei`/`three` (3D), CSS
  Modules (design-token'lı, `var(--border)`/`var(--primary-rgb)` vb.).
- **Ürün:** "ArsaBil" — Türkiye'de arsa payı/kat karşılığı fizibilite
  hesaplayıcısı + "Arsabil Studio" adlı, hesap sonucundan türetilen 3D/2D
  bina kütlesi/yerleşim önizleme modülü.
- **Dev server:** `npm run dev` (webpack, Turbopack DEĞİL — build ise
  Turbopack kullanır, bu ayrım aşağıda önemli).

## Şu An Neredeyiz

`docs/superpowers/plans/` altında bir plan arşivi var; Studio özelliği
fazlar halinde inşa ediliyor (Faz 1 → Faz 1A → Faz 1B → Faz 2 → Faz 2A →
Faz 2B → **Faz 3A [BİTTİ]** → **Faz 3B [SIRADA]** → Faz 3B sonrası Faz 4...).

- `EXECUTION-QUEUE.md` — hangi fazın bittiğini, hangi bilinen boşlukların
  çözüldüğünü, sıradaki dispatch'i özetler. ÖNCE BUNU OKU.
- `NEXT-DISPATCH.md` — sıradaki iş için hazırlanmış, dosya-seviyesinde
  somut bir brief (şu an Faz 3B'yi işaret ediyor). BUNU DA OKU.
- Canonical plan dosyası: `2026-08-19-arsabil-studio-faz3b-senaryo-taslagi-gecmis-ve-karsilastirma.md`
  — Task 1'den başla.

Faz 3A'nın (2D yerleşim tahtası: footprint kapsama/yön/çekme/ticari cephe
kontrolleri, 3D senkronizasyonu) tamamlandığını doğrulamak istersen:
`2026-08-19-arsabil-studio-faz3a-kontrollu-2d-yerlesim-tahtasi.md` dosyasının
sonundaki "Faz 3A — TAMAMLANDI" bölümünü oku.

## Bu Oturumda Öğrenilen, Kırılırsa Pahalıya Patlayan Dersler

Bunlar tahmin değil — bu proje üzerinde gerçekten yaşanmış, tekrar
tekrar çıkan sorunlar:

### 1. Her yeni faz, önceki fazlardan BAĞIMSIZ yazılmış olabilir

Bu plan arşivinde DÖRT kez aynı kök neden çıktı: bir plan dosyası, önceki
bir fazda ZATEN kurulmuş bir dosyayı "Add" (yeni) olarak listeliyordu, ya
da o dosyanın hiç var olmadığını varsayan bağımsız bir veri modeli tarif
ediyordu. Her yeni Task'a başlamadan önce:

```powershell
# Task'ın "Files: Add: X" dediği HER dosya için:
Test-Path "src/lib/studio/X.ts"   # veya ilgili yol
```

Eğer dosya ZATEN varsa: DUR. Mevcut dosyayı oku, plan'ın onu nasıl
kullanmayı beklediğiyle karşılaştır, çakışma varsa kullanıcıya sor (bu
oturumda birkaç kez böyle bir soru soruldu ve kullanıcı karar verdi —
o kararlar ilgili plan dosyalarının en üstünde "Re-scope Notu" / "Model
Birleştirme Notu" başlıklarıyla kayıtlı, örnek için
`2026-08-19-arsabil-studio-faz2b-arsa-sahibi-teklif-ve-dengeleme.md`ye bak).

### 2. Çalışan hesap motorlarına "mantıksız" değişiklik ZORLAMA

Kullanıcının verdiği açık talimat (Faz 2B re-scope'unda): "calculator
doğru hesap yapıyor, mantıksız olabilecek bir değişiklikle etkilenmesin,
böyle bir şey varsa kapsam dışı bırakılsın." Bu ilke GENEL bir kural
olarak uygulandı: `src/lib/studio/landownerOffer.ts` (Faz 2'de kurulan,
test edilmiş hak ediş/teklif hesabı) hiçbir fazda DEĞİŞTİRİLMEDİ — yeni
özellikler onun ÜZERİNE, ek/opsiyonel parametrelerle inşa edildi.

Faz 3B, `src/lib/studio/offerValidation.ts`i (Faz 2B'de kurulan, 7 testi
olan bir dosya) MODIFY edecek. Aynı ilkeyi uygula: mevcut 7 test
davranışlarını DEĞİŞTİRMEDEN kalmalı; yeni davranış (örn. `needsRebalance`)
ADDİTİVE (yeni, opsiyonel alan/dönüş değeri) olmalı.

### 3. TDD sıkı uygulandı — kırma

Her yeni fonksiyon/bileşen için: önce test yaz → `npx jest <dosya>` çalıştır
→ KIRMIZI olduğunu gör (doğru sebepten, "module not found" gibi) → sonra
implementasyonu yaz → YEŞİL olduğunu gör. Testi yazmadan kod yazma.

### 4. `npm run dev` YETMEZ — gerçek `npm run build` şart

Bu proje `npm run dev`de webpack, `npm run build`de Turbopack kullanıyor.
CSS Modules `composes` gibi bazı özellikler ikisinde FARKLI davranabiliyor
(daha önce bu projede cross-file `composes` Turbopack'te patladı, dev'de
sorunsuzdu). Her önemli UI değişikliğinden sonra:

```powershell
npx tsc --noEmit -p .
npx jest <ilgili dizinler>
npm run build
```

Üçü de temiz olmadan bir Task'ı "bitti" sayma.

### 5. Görsel doğrulama gerçek tarayıcıda yapılmalı, jsdom yetmez

Bu oturumda `isPointInPolygon` adlı saf bir geometri fonksiyonunda GERÇEK
bir bug vardı: bir poligonun KENDİ köşeleri, kendi poligonuna karşı test
edilince ray-casting algoritması dejenere oluyordu (standart edge-case).
Birim testleri bunu KAÇIRDI çünkü hiçbir test senaryosu "bir poligonun
kendi köşelerini kendine karşı test etme" durumunu kapsamıyordu — sadece
Playwright ile gerçek tarayıcıda, varsayılan (değiştirilmemiş) durumda
sahte bir "parselin dışına taşıyor" uyarısı GÖRÜLEREK bulundu.

Yeni bir geometri/görsel özellik bittiğinde:

```powershell
# Dev server zaten calisiyorsa atla:
# npm run dev:next  (arka planda, run_in_background)
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/
node output/playwright/<yeni-script>.cjs
```

`output/playwright/studio-2d-layout-smoke.cjs` ve `landowner-offer-smoke.cjs`
örnek/yeniden kullanılabilir script'ler — aynı deseni takip et (dev server'a
git, "Örnek Proje ile Dene" ile örnek veri doldur, ekran görüntüsü al,
sonucu oku).

Playwright screenshot'ları Read tool ile GÖRSEL olarak incele — sadece
`results` JSON'una güvenme, en az bir-iki ekran görüntüsünü gerçekten aç.

### 6. Yeni bir UI paneli → AYNI oturumda hem masaüstü hem mobil kabloa

Bu proje `/hesapla` sayfasının mobil dalı (`HesaplaMobile.tsx`) masaüstü
dalından (`page.tsx`) TAMAMEN AYRI bir JSX ağacı render ediyor (erken
`return`). Bir masaüstü paneli mobilde OTOMATİK görünmez. Kurulu desen —
her yeni panel için AYNEN tekrarla:

1. `src/components/studio/XPanel.tsx` (masaüstü bileşeni).
2. `src/app/hesapla/mobile/XMobileLeaf.tsx` — `XPanel`i "Kapat" başlıklı
   bir yaprakla sarmalar, KOPYALAMAZ. Bkz. `LandownerOfferMobileLeaf.tsx`
   veya `Studio2DMobileLeaf.tsx` (bu ikinci örnek, mobilde ekran alanı
   kısıtlı olduğu için masaüstünün İKİ panelini TEK yaprakta birleştiriyor
   — gerekirse aynı esnekliği uygula).
3. `SonucKarti.tsx`ye yeni bir buton (`onXAc` prop).
4. `HesaplaMobile.tsx`/`page.tsx`e `xAcik`/`mobilXAcik` state.

### 7. Asla commit atma, kullanıcı istemeden

Bu oturum boyunca TEK bir commit yapılmadı — sadece dosya düzenlemeleri.
Kullanıcı açıkça "commit at" demeden `git add`/`git commit` ÇALIŞTIRMA
(not: bu repo zaten git değil, ama ileride git init edilirse aynı kural
geçerli).

### 8. Kalan (bilerek yapılmayan) işler — sahiplenmeye çalışma

- `output/.worktrees/anasayfa-taste-skill-revizyonu/` adlı ESKİ bir kopya
  var, jest bazen onu da tarayıp sahte hata üretiyor. Bu proje kapsamı
  DIŞINDA — `--testPathIgnorePatterns='/\.worktrees/'` ile filtrelenebilir
  ama filtre kusursuz çalışmayabilir; FAIL çıktısını her zaman `.worktrees`
  içinde mi diye kontrol et, gerçek `src/` altındaki testler öncelik.
- Faz 3B planı `LandownerOfferPanel.tsx` yerine `ProgramMixPanel.tsx`yi
  "modify" olarak işaretlemişti bir önceki fazda (Faz 3A Task 5 bullet 3) —
  plan METNİ ile dosya LİSTESİ birbiriyle çelişebiliyor; çelişki varsa
  DOSYA LİSTESİNE uy, metne değil (ya da kullanıcıya sor).

## Bittiğinde Ne Yapmalı

1. İlgili plan dosyasındaki checkbox'ları `[x]` yap, her birine NE
   yapıldığını (dosya adı, test sayısı) tek satırla ekle.
2. Plan dosyasının sonuna "Faz 3B — TAMAMLANDI (tarih)" bölümü ekle
   (Faz 3A'nın sonundaki örneğe bak).
3. `EXECUTION-QUEUE.md`ye tamamlanan fazı ekle, varsa yeni "Bilinen
   Boşluk" bulgularını belgele.
4. `NEXT-DISPATCH.md`yi bir sonraki faz için güncelle (execution-sequence
   dosyasına bak: `2026-08-16-arsabil-studio-execution-sequence.md`).
5. Kullanıcıya commit atıp atmayacağını SOR, kendiliğinden commit atma.
