# Agent Handoff — Arsabil Studio Vitrin (3D Görsel Zenginleştirme)

Bu dosya, bu konuşmanın hiçbir belleği olmayan başka bir modele (Gemini
3.7 vb.) sıradaki işi devretmek içindir.

**ÖNCE `AGENT-HANDOFF-FAZ3B.md`yi oku** (aynı klasörde) — orada anlatılan 8
genel ders (TDD disiplini, gerçek `npm run build` zorunluluğu, Playwright
ile görsel doğrulama, masaüstü+mobil kablolama deseni, asla commit atma
vb.) burada TEKRARLANMIYOR ama TAMAMEN GEÇERLİ. Bu dosya yalnızca bu
işe ÖZGÜ ek bilgiyi içerir.

## Neredeyiz

- Faz 4A + Faz 4B (Studio kalıcı senaryo, versiyonlama, teklif raporu,
  güvenli paylaşım) **TAMAMLANDI** ve iki kez bağımsız incelendi.
- Bu iş, kullanıcıyla TAM bir brainstorm+spec sürecinden geçti
  (`superpowers:brainstorming` skill, mimari path). Spec ve plan ZATEN
  yazılmış — yeniden tasarlama YOK, doğrudan Task 1'den uygula.
- **Spec:** `docs/superpowers/specs/2026-08-23-arsabil-studio-vitrin-3d-gorsel-zenginlestirme-design.md`
- **Plan:** `docs/superpowers/plans/2026-08-23-arsabil-studio-vitrin-3d-gorsel-zenginlestirme.md` (7 task, hiçbiri başlanmadı)

## Bu İşe Özgü Riskler

### 1. Asset'ler GERÇEKTEN indirilmeli, isim uydurulmamalı

Task 1, polyhaven.com'dan gerçek CC0 asset seçimini istiyor (en az 2 ağaç
modeli, 1 asfalt/yol PBR seti, 1 açık-hava HDRI). Bunlar GERÇEKTEN o
siteden indirilmeli — dosya adı/URL uydurma, "muhtemelen böyle bir şey
vardır" diye tahmin etme. Her asset'in CC0 olduğunu (Poly Haven'ın TÜM
içeriği CC0'dır, ama yine de indirdiğin sayfada teyit et) ve
`public/studio-assets/LICENSE.md`ye kaydedildiğini doğrula.

**Self-host zorunlu:** İndirilen dosyalar `public/studio-assets/` altında
saklanır. Çalışma zamanında (`StudioVitrinScene.tsx` içinde) polyhaven.com'a
CANLI bağlantı OLMAMALI — bu, Task 4'ün kaynak-tarama testinde
(`StudioVitrinScene.scope.test.ts`) `expect(source).not.toMatch(/polyhaven\.com/)` ile
zaten kontrol ediliyor, ama neden önemli olduğunu bil: internet
kesilirse/Poly Haven kapanırsa/CDN yavaşlarsa ürün bozulmamalı.

### 2. Geometri matematiği — bu projede İKİ KEZ gerçek bug'a yol açtı

`isPointInPolygon` (Faz 3A'da: bir poligonun kendi köşeleri kendine karşı
test edilince ray-casting dejenere oluyordu) ve `ProgramMixItem` alan adı
karışıklığı (Faz 4A VE Faz 4B'de İKİ KEZ tekrarlandı: `allocatedAreaM2`/
`averageUnitAreaM2` diye uydurulan alanlar, gerçeği `unitCount`/
`unitAreaM2`) — bu projede geometri/veri-alanı hataları SESSİZCE üretim
koduna sızdı, birim testleri bile bazen kaçırdı.

Bu plan bu dersi zaten uyguluyor: Task 2/3'teki test kodu ELLE
hesaplanmış, doğrulanmış beklenen değerler içeriyor (örn. "10x10 kare
footprint, 3 kat → her kenarda 4 pencere × 3 kat = 12 pencere" — bu sayı
tahmin değil, gerçek formülden türetildi). **Bu test kodunu DEĞİŞTİRMEDEN
aynen kullan** — kendi varsayımınla "daha basit" bir versiyon yazma,
zaten doğrulanmış.

Mevcut `geometry2d.ts`/`parcelGeometry.ts` fonksiyonlarını (`isPointInPolygon`,
`computePolygonBounds`, `closePolygon`/`openPolygon`, `deriveFootprintPolygon`)
YENİDEN KULLAN — kendi versiyonunu yazma, zaten test edilmiş ve bir kez
düzeltilmiş.

### 3. Task 6'daki route KESİN yerleşim DEĞİL

`/studio/scenarios/[scenarioId]/versions/[versionNumber]/vitrin` yalnızca
geliştirme/doğrulama amaçlı geçici bir kapı. Bunu "ürünün nihai yeri" gibi
ele alıp üzerine fazladan UI/navigasyon inşa etme — spec bunu bilinçli
olarak SONRAYA bırakıyor.

### 4. Görsel kalite hedefi — abartma ama hafife de alma

Spec'in "Hedef kalite" satırı: modern tarayıcı tabanlı emlak
görselleştirmesi seviyesi (PBR + HDRI ile "inandırıcı gerçekçi"), offline
ray-traced render (V-Ray/Lumion) seviyesi DEĞİL. Task 4'ü uygularken PBR
materyal (`MeshStandardMaterial`/`MeshPhysicalMaterial`) ve HDRI ortam
ışığını (`@react-three/drei`'nin `Environment` bileşeni) atlama — bunlar
"nice to have" değil, spec'in temel kalite gereksinimi.

## Bittiğinde

`AGENT-HANDOFF-FAZ3B.md`nin "Bittiğinde Ne Yapmalı" bölümündeki 5 adımı
uygula (plan dosyasının Task 7 Adım 5-6'sı zaten bunu kapsıyor). Playwright
ekran görüntülerini gerçekten GÖZLE incele (Read tool ile) — yalnızca
script'in "PASS" demesine güvenme, bu işin bütün amacı görsel kalite.
