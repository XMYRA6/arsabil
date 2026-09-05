import fs from 'fs';
import path from 'path';

describe('StudioVitrinScene — kaynak dogrulama', () => {
  it('StudioVitrinScene.tsx kaynak dosyasini denetler', () => {
    const sourcePath = path.join(__dirname, 'StudioVitrinScene.tsx');
    expect(fs.existsSync(sourcePath)).toBe(true);
    const source = fs.readFileSync(sourcePath, 'utf8');

    // 1. Lib katmanindan importlar
    expect(source).toMatch(/import\s*\{[^}]*generateProceduralFacade[^}]*\}\s*from\s*'@\/lib\/studio\/proceduralFacade'/);
    expect(source).toMatch(
      /import\s*\{[^}]*(generateSiteContext|selectRoadEdge)[^}]*\}\s*from\s*'@\/lib\/studio\/siteContext'/
    );

    // 2. Self-host GLTFLoader ve polyhaven canlı bağlantısı olmaması
    expect(source).toMatch(/GLTFLoader/);
    expect(source).toMatch(/\/studio-assets\//);
    expect(source).not.toMatch(/polyhaven\.com/);

    // 3. Asset hata yakalama
    expect(source).toMatch(/onError|\.catch\(/);

    // 4. Frameloop demand
    expect(source).toMatch(/frameloop=["']demand["']/);

    // 5. layoutDraft varsa footprint override GERCEKTEN hesaplanmali
    // (deriveFootprintPolygon ile) — sabit `undefined` DEGIL. Bug: iki
    // ternary dali da `undefined` donerse bu regex eslesmez.
    expect(source).toMatch(/import\s*\{[^}]*deriveFootprintPolygon[^}]*\}\s*from\s*'@\/lib\/studio\/geometry2d'/);
    expect(source).toMatch(/deriveFootprintPolygon\(\s*mass\.footprint\.points\s*,\s*snapshot\.layoutDraft\.footprint\s*\)/);

    // 6. Poly Haven agac GLB'leri Draco-sikistirilmis — DRACOLoader
    // baglanmazsa yukleme her zaman basarisiz olur (bkz. bug: her iki
    // agac da sessizce fallback koniye duserdi). Self-host edilen
    // cozucu yolu kullanilmali, CDN'e baglanilmamali.
    expect(source).toMatch(/import\s*\{[^}]*DRACOLoader[^}]*\}\s*from\s*'three\/examples\/jsm\/loaders\/DRACOLoader\.js'/);
    expect(source).toMatch(/setDecoderPath\(\s*['"]\/studio-assets\/draco\//);
    expect(source).toMatch(/setDRACOLoader\(/);

    // 7. Environment (HDRI) KENDI Suspense sinirinda olmali — aksi halde
    // HDR yuklenene kadar TUM sahne (bina/pencere/agac/yol) gizli kalir
    // (bug: sahne suresiz bos kaliyordu, ekran goruntusuyle dogrulandi).
    expect(source).toMatch(/<Suspense[^>]*>\s*<Environment/);

    // 8. RoadMesh dokulari Suspense-tabanli useTexture ile yuklenmeli, ham
    // THREE.TextureLoader().load()+setState DEGIL — frameloop="demand"
    // altinda resim asenkron gelince invalidate tetiklenmedigi icin yol
    // dokusuz/duz siyah kaliyordu (bug, ekran goruntusuyle dogrulandi).
    expect(source).toMatch(/import\s*\{[^}]*useTexture[^}]*\}\s*from\s*'@react-three\/drei'/);
    expect(source).not.toMatch(/new\s+THREE\.TextureLoader/);
    expect(source).toMatch(/<Suspense[^>]*>\s*<RoadMesh/);

    // 9. Capture handle callback-prop deseniyle disari sunulmali (Task 6/7/8 —
    // ust bilesenin StudioVitrinCapture.captureFrame'e erisebilmesi icin).
    // NOT: forwardRef/useImperativeHandle DEGIL — next/dynamic({ssr:false})
    // bu kod tabanindaki Next/React surum kombinasyonunda ref'i cozumlenmis
    // forwardRef bilesenine iletmiyor (ampirik olarak dogrulandi), duz
    // prop'lar next/dynamic uzerinden sorunsuz gectigi icin callback prop'a
    // gecildi.
    expect(source).toMatch(
      /import\s*\{[^}]*StudioVitrinCapture[^}]*\}\s*from\s*'\.\/StudioVitrinCapture'/
    );
    expect(source).toMatch(/onCaptureReady/);
    expect(source).toMatch(/<StudioVitrinCapture\s+onCaptureReady=\{onCaptureReady\}\s*\/>/);
    expect(source).not.toMatch(/forwardRef/);
  });
});
