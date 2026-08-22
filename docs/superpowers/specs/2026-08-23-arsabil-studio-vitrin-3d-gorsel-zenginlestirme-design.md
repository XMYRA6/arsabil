# Arsabil Studio — Vitrin (3D Görsel Zenginleştirme) Design Spec

> **İlişkili:** `2026-08-16-arsabil-studio-rapor-paylasim-design.md` (Faz 4B'nin ürettiği `StudioProposalViewModel`/`StudioScenarioVersion` altyapısını tüketir). `2026-08-16-arsabil-studio-2d-3d-mvp-design.md`'nin devamıdır — mevcut `BuildingMass`/`StudioScene` mimarisini DEĞİŞTİRMEZ, üzerine yeni bir sunum katmanı ekler.

## Product Decision

Arsabil'in mevcut Studio 3D önizlemesi (basit renkli kutu kütle) fizibilite verisini doğru gösteriyor ama pazara "mükemmel bir yazılım" iddiasıyla çıkacak bir ürün için görsel olarak yeterince ikna edici değil. Kullanıcıya (arsa sahibi, yatırımcı, ortak) gösterildiğinde "bu gerçek bir bina/arsa görselleştirmesi" hissi vermeli — offline mimari render (V-Ray/Lumion) seviyesi değil, ama tarayıcıda gerçek zamanlı, inandırıcı bir kalite.

Bu spec, mevcut hesap motoruna veya mevcut `/hesapla` Studio önizlemesine DOKUNMADAN, **ayrı, yeniden kullanılabilir bir "vitrin" render bileşeni** tanımlar: aynı gerçek fizibilite verisini (kaydedilmiş `StudioScenarioVersion`) çok daha zengin bir 3D sahneye çevirir.

## Core User Story

> "Parselimi kaydettim, fizibilite hesabı çıktı. Şimdi bu arsada gerçekte nasıl bir bina durabileceğini — pencereleriyle, etrafındaki ağaç/yolla — görmek istiyorum. Bu görseli ortağıma/arsa sahibine gösterip 'işte önerimiz bu' diyebilmeliyim."

## Kapsam

**Bu spec kapsar:**
- Mevcut `BuildingMass`'tan otomatik üretilen, prosedürel pencere/cephe detaylı bina kütlesi
- Parsel çevresine yerleştirilen, hazır (CC0) ağaç/yol/sokak objeleri ile site bağlamı
- PBR materyal + HDRI ortam ışığı ile "inandırıcı gerçekçi" (fotogerçekçi DEĞİL) görsel kalite
- Mevcut Faz 4A/4B kalıcılık altyapısının (owner-only erişim) yeniden kullanılması

**Bu spec kapsam DIŞI bırakır (ayrı, gelecekteki kararlar):**
- Arsaya otomatik "kaç daire/bina sığar" önerisi üreten algoritma — bu spec, ELLE girilmiş/mevcut `ProgramMixItem` verisini görselleştirir, YENİ bir öneri motoru İÇERMEZ.
- Kredi/abonelik ile rapor satışı (billing/erişim kontrolü) — 3D render'la ilgisi yok, tamamen ayrı bir ürün kararı.
- Bu vitrinin nihai yerleşimi (`/hesapla` içine mi, ayrı bir sayfaya mı, paylaşım linkine mi ekleneceği) — bilinçli olarak SONRAYA bırakıldı.

## Mimari

**Değişmeyen ilke (mevcut mimarinin devamı):** 3D renderer hiçbir zaman fizibilite/emsal/teklif hesabı yapmaz; yalnızca zaten hesaplanmış `StudioSnapshotDraft`'ı görselleştirir. Bu spec bu sınırı KORUR, ihlal etmez.

**Veri kaynağı:** Yeni bir veri yolu icat edilmez. Mevcut Faz 4A/4B zinciri aynen kullanılır:

```
StudioScenarioVersion (DB, Prisma)
  → parseStudioScenarioVersionRecord (mevcut, persistenceTypes.ts)
  → StudioSnapshotDraft (mevcut contract)
  → [YENİ] proceduralFacade.ts + siteContext.ts (saf fonksiyonlar)
  → [YENİ] StudioVitrinScene.tsx (Three.js render)
```

**Geçici geliştirme/test kapısı:** Bileşen route'tan bağımsız olacağı için, geliştirme sırasında görebilmek adına mevcut owner-only kalıcılık kontrolünü kullanan basit bir önizleme route'u açılır (örn. `/studio/scenarios/[scenarioId]/versions/[versionNumber]/vitrin`). Bu KESİN yerleşim kararı DEĞİLDİR, yalnızca doğrulama amaçlıdır.

## Bileşenler

**Yeni saf fonksiyonlar** (`src/lib/studio/`, Three.js'e bağımlı DEĞİL, jsdom'da tam test edilebilir):

- `proceduralFacade.ts` — `BuildingMass` (footprint + kat sayısı + yükseklik) girdisinden pencere/çerçeve **konum verisi** üretir (Three.js nesnesi değil, düz sayı dizileri). Her footprint/kat sayısına otomatik uyarlanır.
- `siteContext.ts` — parsel poligonu + footprint'ten, footprint DIŞINDA kalan alana ağaç/yol objelerinin yerleşim noktalarını (`{assetId, x, y, rotationDeg}[]`) üretir.

**Yeni render bileşeni** (`src/components/studio/`):

- `StudioVitrinScene.tsx` — yukarıdaki iki fonksiyonun çıktısını + `StudioSnapshotDraft`ı alıp Three.js/`@react-three/fiber` sahnesini kurar. `GLTFLoader` ile `public/` altında **self-host edilen** (build zamanında indirilmiş, çalışma anında Poly Haven'a bağlanılmaz), CC0 lisanslı, küçük bir model seçkisi (2-3 ağaç varyasyonu, yol dokusu, birkaç sokak objesi) yüklenir.

## Görsel Yaklaşım (bu brainstorm'da karara bağlanan)

| Öge | Yaklaşım | Gerekçe |
|---|---|---|
| Bina kütlesi/cephesi | **Prosedürel geometri** (kod ile üretilen gerçek 3D pencere/çerçeve) | Her arsa/kat sayısına otomatik uyarlanmalı; hazır asset bunu karşılayamaz |
| Ağaç/yol/sokak objeleri | **Hazır CC0 asset (Poly Haven)** | Gerçekçi organik formların (ağaç) prosedürel üretimi, hazır kaliteli asset kullanmaktan çok daha zor ve sonucu daha kötü olurdu |
| Materyal | **PBR** (Physically Based Rendering, Three.js `MeshStandardMaterial`/`MeshPhysicalMaterial`) | Düz renk yerine gerçek doku/yansıma |
| Işıklandırma | **HDRI ortam haritası** (Poly Haven, CC0) | PBR materyal, doğru ortam ışığı olmadan gerçekçi durmaz |
| Asset kaynağı | Yalnızca **CC0 lisanslı** kaynaklar (Poly Haven öncelikli) | Ticari ürün — lisans riski sıfır olmalı |
| Hedef kalite | "İnandırıcı gerçekçi" (modern tarayıcı tabanlı emlak görselleştirme seviyesi) | Offline ray-traced render (V-Ray/Lumion) seviyesi gerçek zamanlı WebGL'in fiziksel sınırı dışında — hedeflenmiyor |

## Hata Yönetimi (mevcut desenlerin yeniden kullanımı)

- Veri eksikse (`buildingMass`/`parcelPolygon` yok) → `StudioPreview.tsx`'teki ile aynı boş-durum deseni.
- WebGL desteklenmiyorsa → mevcut `isWebGLAvailable()`/`StudioFallback` deseni.
- Bir asset (örn. ağaç modeli) yüklenemezse → **bina yine de gösterilir**; yalnızca o dekor eksik kalır. Sahne asla tamamen çökmez veya boş kalmaz.

## Test Stratejisi

- `proceduralFacade.ts`/`siteContext.ts` → TDD, tam Jest kapsamı (jsdom, Three.js gerekmez).
- `StudioVitrinScene.tsx` → Canvas jsdom'da render edilemediği için: `StudioScene.scope.test.ts` tarzı kaynak-tarama testleri + `StudioPreview.test.tsx` tarzı mock'lanmış prop-geçişi testleri.
- **Gerçek tarayıcıda Playwright görsel doğrulaması** — bu özellik için normalden kritik, çünkü hedef doğrudan görsel kalite. WebGL yok / asset yüklenemedi / veri eksik senaryoları dahil.
- `npm run build` (Turbopack) — yeni GLB dosyalarının build'e doğru dahil olduğunu doğrular.

## UX Prensipleri

- "Ön teklif/senaryo" dili korunur (Faz 2B/4B'de kurulan aynı ilke) — bu bir mimari çizim veya bağlayıcı taahhüt değildir.
- Görsel önce, sayısal veri sonra — ama sayısal veri (m², kat sayısı, daire adedi) her zaman erişilebilir kalır, görsel onun YERİNE geçmez.
- Prototip/maket hissi kabul edilebilir ve İSTENEN'dir — tam mimari çizim (AutoCAD seviyesi) taklit edilmeye ÇALIŞILMAZ; bu spec'in değeri, mühendisin gerçek çizime geçmeden ÖNCE bir başlangıç noktası sunmasıdır.

## Non-Goals

- Otomatik daire/yerleşim önerisi algoritması (ayrı karar noktası).
- Kredi/abonelik/ödeme entegrasyonu (ayrı karar noktası).
- Offline/ray-traced render kalitesi (fiziksel/zaman bütçesi sınırı).
- Dış API'den (OSM/Overpass, TKGM dışı) canlı veri çekimi — mevcut mimarinin "harici kaynak scraping yapılmaz" kuralı geçerliliğini korur.
- Full CAD, iç mimari editörü, AR, marketplace — mevcut mimari kararların hâlâ geçerli olduğu, bu spec'in hiç dokunmadığı alanlar.

## Acceptance Principles

- Kayıtlı bir Studio senaryosu, mevcut mimariye hiç dokunulmadan, yeni bir vitrin sahnesinde açılabilir.
- Bina kütlesi, snapshot'taki GERÇEK footprint/kat sayısına otomatik uyum sağlar (elle ayarlama gerekmez).
- Sahne, en az bir ağaç/yol objesiyle site bağlamı gösterir.
- WebGL yok / asset eksik / veri eksik durumlarında sahne asla boş/kırık kalmaz.
- Kullanılan tüm 3D asset'ler CC0 lisanslıdır ve projede self-host edilir (çalışma anında dış bağlantı yok).
