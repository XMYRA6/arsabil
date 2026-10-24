/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StudioPreview } from './StudioPreview';
import type { BuildingMass, ProgramMixItem } from '@/lib/studio/types';

type MockedSceneProps = {
  showWireframe: boolean;
  showFloorBands: boolean;
  programBands?: unknown[];
  footprintOverride?: { x: number; y: number }[];
};
const defaultSceneImpl = (props: MockedSceneProps) => (
  <div data-testid="studio-scene">
    wireframe:{String(props.showWireframe)} bands:{String(props.showFloorBands)} programBandCount:{props.programBands?.length ?? 0} footprintOverrideCount:{props.footprintOverride?.length ?? 'none'}
  </div>
);
const sceneMock = jest.fn(defaultSceneImpl);

jest.mock('./StudioScene', () => ({
  StudioScene: (props: MockedSceneProps) => sceneMock(props),
}));

const isWebGLAvailableMock = jest.fn(() => true);
jest.mock('./webglSupport', () => ({
  isWebGLAvailable: () => isWebGLAvailableMock(),
}));

const isElementVisibleMock = jest.fn(() => true);
jest.mock('./useIsElementVisible', () => ({
  useIsElementVisible: () => [jest.fn(), isElementVisibleMock()],
}));

const mass: BuildingMass = {
  footprint: {
    source: 'demo',
    points: [
      { x: 0, y: 0 },
      { x: 20, y: 0 },
      { x: 20, y: 10 },
      { x: 0, y: 10 },
    ],
  },
  heightM: 12.8,
  floorCount: 4,
  floorHeightM: 3.2,
  grossConstructionAreaM2: 2800,
  warnings: [],
};

describe('StudioPreview', () => {
  beforeEach(() => {
    sceneMock.mockClear();
    isWebGLAvailableMock.mockReturnValue(true);
    isElementVisibleMock.mockReturnValue(true);
  });

  it('mass yokken WebGL scene render etmeden veri uyarilarini gosterir', () => {
    render(
      <StudioPreview
        mass={null}
        warnings={[{ code: 'MISSING_GEOMETRY', message: 'Parsel geometrisi eksik.' }]}
        geometryStatus="missing"
      />,
    );

    expect(screen.getByText('3D önizleme için veri bekleniyor')).toBeInTheDocument();
    expect(screen.getByText(/parsel geometrisi ve inşaat alanı gerekiyor/i)).toBeInTheDocument();
    expect(screen.getByText('Geometri eksik')).toBeInTheDocument();
    expect(screen.getByText('Parsel geometrisi eksik.')).toBeInTheDocument();
    expect(screen.queryByTestId('studio-scene')).not.toBeInTheDocument();
  });

  it('mass varsa scene, kaynak notlari, ozet ve gorunum kontrollerini render eder', async () => {
    const user = userEvent.setup();
    render(
      <StudioPreview
        mass={mass}
        geometrySource="Demo parsel siniri"
        geometryStatus="demo"
        constructionAreaSource="Tahmini insaat alani"
        constructionAreaEstimated
      />,
    );

    await user.click(screen.getByRole('button', { name: /3D önizlemeyi göster/i }));
    expect(await screen.findByTestId('studio-scene')).toHaveTextContent('wireframe:true bands:true');
    expect(screen.getByText('Demo geometri')).toBeInTheDocument();
    expect(screen.getByText('Demo parsel siniri')).toBeInTheDocument();
    expect(screen.getByText('Tahmini insaat alani')).toBeInTheDocument();
    expect(screen.getByText(/İnşaat alanı tahmini/i)).toBeInTheDocument();
    expect(screen.getByText('2.800 m²')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Tel kafes' }));
    expect(screen.getByTestId('studio-scene')).toHaveTextContent('wireframe:false bands:true');

    await user.click(screen.getByRole('button', { name: 'Kat bantları' }));
    expect(screen.getByTestId('studio-scene')).toHaveTextContent('wireframe:false bands:false');
  });


  // Faz 1B Task 2 bullet 3: uyari varken kutle GIZLENMEZ (panel yine acilip
  // 3D gorulebilir); uyari, sahneyi kaplamayan ayri bir bilgi katmaninda
  // gosterilir. Onceki halde `warnings` prop'u yalnizca mass=null dalinda
  // okunuyordu — mass varken gelen uyarilar sessizce dusuyordu.
  it('mass varken de uyarilar gosterilir, kutle gizlenmez', () => {
    render(
      <StudioPreview
        mass={mass}
        warnings={[{ code: 'DEMO_GEOMETRY', message: 'Demo geometri kullaniliyor.' }]}
        geometryStatus="demo"
      />,
    );

    expect(screen.getByText('Demo geometri kullaniliyor.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /3D önizlemeyi göster/i })).toBeInTheDocument();
  });

  // Faz 1B Task 4 bullet 2: cok noktali/karmasik footprint icin nokta
  // limiti + sadelestirme uyarisi — mobil GPU'da yavaslamaya yol acabilecek
  // parselleri kullaniciya erkenden bildirir.
  it('footprint nokta sinirini asinca sadelestirme uyarisi gosterir', () => {
    const complexFootprintMass: BuildingMass = {
      ...mass,
      footprint: {
        source: 'demo',
        points: Array.from({ length: 80 }, (_, i) => ({ x: i, y: i % 2 })),
      },
    };
    render(<StudioPreview mass={complexFootprintMass} />);

    expect(screen.getByText(/sadeleştirilmiş bir sınır önerilir/i)).toBeInTheDocument();
  });

  it('footprint nokta sinirinin altindaysa sadelestirme uyarisi gostermez', () => {
    render(<StudioPreview mass={mass} />);
    expect(screen.queryByText(/sadeleştirilmiş bir sınır önerilir/i)).not.toBeInTheDocument();
  });

  it('verified and draft geometry source labels are explicit', () => {
    const { rerender } = render(
      <StudioPreview
        mass={mass}
        geometryStatus="verified"
        geometrySource="TKGM doğrulanmış parsel sınırı"
        constructionAreaSource="Otoriter inşaat alanı verisi"
        constructionAreaEstimated={false}
      />,
    );

    expect(screen.getByText('Doğrulanmış parsel')).toBeInTheDocument();
    expect(screen.getByText('TKGM doğrulanmış parsel sınırı')).toBeInTheDocument();
    expect(screen.queryByText(/İnşaat alanı tahmini/i)).not.toBeInTheDocument();

    rerender(
      <StudioPreview
        mass={mass}
        geometryStatus="draft"
        geometrySource="Kullanıcı çizimi taslak geometri"
        constructionAreaSource="Tahmini insaat alani"
      />,
    );

    expect(screen.getByText('Taslak geometri')).toBeInTheDocument();
    expect(screen.getByText('Kullanıcı çizimi taslak geometri')).toBeInTheDocument();
  });
  it('gorunumu sifirla scene boundarysini yeniden mount edecek version artisini tetikler', async () => {
    const user = userEvent.setup();
    render(<StudioPreview mass={mass} />);
    await user.click(screen.getByRole('button', { name: /3D önizlemeyi göster/i }));
    await screen.findByTestId('studio-scene');

    expect(sceneMock).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: 'Görünümü sıfırla' }));
    expect(sceneMock).toHaveBeenCalledTimes(2);
  });

  // Kullanici bulgusu/plan gerekcesi (Faz 1B Task 1): three.js/@react-three
  // paketleri agir, mass geldigi an kosulsuz canvas mount etmek ilk hesap
  // sonucunu geciktiriyordu. Panel artik varsayilan KAPALI baslar; canvas
  // (ve onu tasiyan dinamik import) yalnizca kullanici acikca actiginda
  // mount edilir.
  describe('varsayilan kapali / tembel yukleme', () => {
    it('mass gelince panel kapali baslar, scene mount edilmez', () => {
      render(<StudioPreview mass={mass} />);

      expect(screen.queryByTestId('studio-scene')).not.toBeInTheDocument();
      expect(sceneMock).not.toHaveBeenCalled();
      expect(screen.getByRole('button', { name: /3D önizlemeyi göster/i })).toBeInTheDocument();
    });

    it('kullanici acinca scene mount edilir, ozet veriler kapaliyken de gorunur', async () => {
      const user = userEvent.setup();
      render(
        <StudioPreview
          mass={mass}
          geometrySource="Demo parsel siniri"
          geometryStatus="demo"
          constructionAreaSource="Tahmini insaat alani"
        />,
      );

      // Kaynak/ozet bilgisi 3D canvas'tan bagimsiz, kapaliyken de erisilebilir
      // olmali (Faz1A: "sayisal program/teklif ozetleri geometri olmadan
      // gorunebilsin" ilkesiyle ayni ruh).
      expect(screen.getByText('Demo geometri')).toBeInTheDocument();
      expect(screen.getByText('2.800 m²')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /3D önizlemeyi göster/i }));
      expect(await screen.findByTestId('studio-scene')).toBeInTheDocument();
    });

    // Kullanici bulgusu/plan gerekcesi: OrbitControls varsayilan olarak
        // wheel event'inde preventDefault cagirir — kullanici sayfayi
        // kaydirmak icin canvas'in ustunden gecerken sayfa yerine 3D sahne
        // yakinlasiyordu (sayfa kaydirma cakismasi). Etkinlestirme
        // katmani tiklanana kadar wheel canvas'a ulasmaz, sayfa normal
        // kaydirir.
    it('scene acilinca etkinlestirme katmani gorunur, tiklayana kadar sahneyi kaplar', async () => {
      const user = userEvent.setup();
      render(<StudioPreview mass={mass} />);

      await user.click(screen.getByRole('button', { name: /3D önizlemeyi göster/i }));
      await screen.findByTestId('studio-scene');

      expect(screen.getByText(/etkileşimi başlatmak için tıkla/i)).toBeInTheDocument();

      await user.click(screen.getByText(/etkileşimi başlatmak için tıkla/i));
      expect(screen.queryByText(/etkileşimi başlatmak için tıkla/i)).not.toBeInTheDocument();
    });

    it('kapatinca scene sokulur (GPU kaynagini birakir)', async () => {
      const user = userEvent.setup();
      render(<StudioPreview mass={mass} />);

      await user.click(screen.getByRole('button', { name: /3D önizlemeyi göster/i }));
      await screen.findByTestId('studio-scene');

      await user.click(screen.getByRole('button', { name: /3D önizlemeyi gizle/i }));
      expect(screen.queryByTestId('studio-scene')).not.toBeInTheDocument();
    });
  });

  // Faz 1B Task 3: WebGL yok / Canvas hata verdi / geometri eksik uc durumu
  // birbirinden AYRI, canvas gerektirmeyen erisilebilir yollarla ele alinir.
  describe('WebGL fallback', () => {
    it('WebGL desteklenmiyorsa scene mount etmez, canvas gerektirmeyen ozeti gosterir', async () => {
      isWebGLAvailableMock.mockReturnValue(false);
      const user = userEvent.setup();
      render(<StudioPreview mass={mass} />);

      await user.click(screen.getByRole('button', { name: /3D önizlemeyi göster/i }));

      expect(await screen.findByText(/webgl desteklenmiyor/i)).toBeInTheDocument();
      expect(screen.queryByTestId('studio-scene')).not.toBeInTheDocument();
      expect(sceneMock).not.toHaveBeenCalled();
    });

    it('kontroller klavye ile odaklanabilir (gercek <button>, tabIndex/disabled ile devre disi degil)', async () => {
      const user = userEvent.setup();
      render(<StudioPreview mass={mass} />);

      const toggleButton = screen.getByRole('button', { name: /3D önizlemeyi göster/i });
      await user.tab();
      expect(toggleButton).toHaveFocus();

      await user.click(toggleButton);
      const activateOverlay = await screen.findByRole('button', { name: /etkileşimi başlatmak için tıkla/i });
      expect(activateOverlay).not.toHaveAttribute('tabindex', '-1');
      expect(activateOverlay).toBeEnabled();
    });

    it('scene render hatasi firlatirsa (canvas basarisiz) fallback ozete duser, sayfa cokmez', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      // React 18+ concurrent render, ilk hatayi "recover" etmek icin
      // fonksiyonu SENKRON olarak bir kez daha cagirir — `mockImplementationOnce`
      // bu ikinci denemede tuketilmis olur ve hata boundary'e hic ulasmaz.
      // Kalici throw + testin sonunda elle geri alma gerekiyor.
      sceneMock.mockImplementation(() => {
        throw new Error('WebGL context lost');
      });
      try {
        const user = userEvent.setup();
        render(<StudioPreview mass={mass} />);

        await user.click(screen.getByRole('button', { name: /3D önizlemeyi göster/i }));

        expect(await screen.findByText(/3d önizleme yüklenemedi/i)).toBeInTheDocument();
      } finally {
        sceneMock.mockImplementation(defaultSceneImpl);
        consoleErrorSpy.mockRestore();
      }
    });
  });

  // Faz 1B Task 4 bullet 3: panel scroll ile ekran disina ciktiginda sahne
  // SOKULUR — GPU/pil kaynagi bosa harcanmaz, kullanici geri kaydirinca
  // otomatik geri gelir.
  describe('gorunurluge duyarli sahne', () => {
    it('acikken gorunum disina cikarsa scene sokulur, geri gelince yeniden mount edilir', async () => {
      const user = userEvent.setup();
      const { rerender } = render(<StudioPreview mass={mass} />);
      await user.click(screen.getByRole('button', { name: /3D önizlemeyi göster/i }));
      await screen.findByTestId('studio-scene');

      isElementVisibleMock.mockReturnValue(false);
      rerender(<StudioPreview mass={mass} />);
      expect(screen.queryByTestId('studio-scene')).not.toBeInTheDocument();

      isElementVisibleMock.mockReturnValue(true);
      rerender(<StudioPreview mass={mass} />);
      expect(await screen.findByTestId('studio-scene')).toBeInTheDocument();
    });
  });

  // Faz 2A Task 4: legend, ozet ve sahne renklerinin AYNI envanterden
  // (programMixItems) geldigini dogrular.
  describe('program bandi legend', () => {
    const items: ProgramMixItem[] = [
      { id: 'a', use: 'residential', residentialType: '2+1', unitCount: 6, unitAreaM2: 85, floorRange: { startFloor: 1, endFloor: 3 } },
      { id: 'b', use: 'commercial', unitCount: 3, unitAreaM2: 40, floorRange: { startFloor: 0, endFloor: 0 } },
    ];

    it('programMixItems verilmezse legend gorunmez, StudioScene programBands=[] alir', async () => {
      const user = userEvent.setup();
      render(<StudioPreview mass={mass} />);
      expect(screen.queryByRole('list', { name: /program bandı lejantı/i })).not.toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /3D önizlemeyi göster/i }));
      const scene = await screen.findByTestId('studio-scene');
      expect(scene).toHaveTextContent('programBandCount:0');
    });

    it('programMixItems (kat araligi atanmis) verilince legend gorunur, StudioScene ayni bant sayisini alir', async () => {
      const user = userEvent.setup();
      render(<StudioPreview mass={mass} programMixItems={items} />);

      const legend = screen.getByRole('list', { name: /program bandı lejantı/i });
      expect(legend).toHaveTextContent('Konut');
      expect(legend).toHaveTextContent('Ticari (Dükkan)');

      await user.click(screen.getByRole('button', { name: /3D önizlemeyi göster/i }));
      const scene = await screen.findByTestId('studio-scene');
      expect(scene).toHaveTextContent('programBandCount:2');
    });

    it('kat araligi atanmamis kalemler icin legend gorunmez (bant uretilemez)', () => {
      render(<StudioPreview mass={mass} programMixItems={[{ id: 'x', use: 'residential', residentialType: '2+1', unitCount: 4, unitAreaM2: 85 }]} />);
      expect(screen.queryByRole('list', { name: /program bandı lejantı/i })).not.toBeInTheDocument();
    });
  });

  // Faz 3A Task 5 bullet 1: 2D yerlesim tahtasinin footprint'i 3D kutleye aktarilir.
  describe('layoutDraft → footprintOverride (Faz 3A Task 5)', () => {
    const layoutDraft = {
      footprint: { centerX: 0, centerY: 0, rotationDeg: 0, scale: 0.5, insetM: 0 },
      setback: { frontM: 0, sideM: 0, rearM: 0 },
      programBandIds: [],
    };

    it('layoutDraft verilmezse StudioScene footprintOverride PROP U ALMAZ (mevcut davranis korunur)', async () => {
      const user = userEvent.setup();
      render(<StudioPreview mass={mass} />);
      await user.click(screen.getByRole('button', { name: /3D önizlemeyi göster/i }));
      const scene = await screen.findByTestId('studio-scene');
      expect(scene).toHaveTextContent('footprintOverrideCount:none');
    });

    it('layoutDraft verilirse deriveFootprintPolygon SONUCU StudioScene e footprintOverride olarak gecer', async () => {
      const user = userEvent.setup();
      render(<StudioPreview mass={mass} layoutDraft={layoutDraft} />);
      await user.click(screen.getByRole('button', { name: /3D önizlemeyi göster/i }));
      const scene = await screen.findByTestId('studio-scene');
      // mass.footprint 4 noktali bir dikdortgen -> footprintOverride de 4 nokta.
      expect(scene).toHaveTextContent('footprintOverrideCount:4');
    });
  });

  // Faz 3A Task 5 bullet 2: 2D legend, 3D bant ve envanter ozeti AYNI ID.
  describe('programBands dis kaynaktan (Faz 3A Task 5)', () => {
    it('programBands verilirse ICERIDE YENIDEN TURETMEZ, verileni aynen kullanir', async () => {
      const user = userEvent.setup();
      const externalBands = [
        { id: 'external-band', use: 'residential' as const, floorRange: { startFloor: 1, endFloor: 2 }, areaM2: 100, colorSlotIndex: 0 },
      ];
      render(<StudioPreview mass={mass} programBands={externalBands} />);
      const legend = screen.getByRole('list', { name: /program bandı lejantı/i });
      expect(legend).toHaveTextContent('Konut');

      await user.click(screen.getByRole('button', { name: /3D önizlemeyi göster/i }));
      const scene = await screen.findByTestId('studio-scene');
      expect(scene).toHaveTextContent('programBandCount:1');
    });
  });
});

