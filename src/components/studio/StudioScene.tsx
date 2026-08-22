'use client';

import { Edges, OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { useMemo } from 'react';
import { useReducedMotion } from 'framer-motion';
import * as THREE from 'three';
import { createMassGeometry, resolveEffectiveMass } from './buildMassGeometry';
import { computeInitialCameraView } from './studioCamera';
import { getFloorBandHeights } from './floorBands';
import { mapProgramBandsToWorldY, createProgramBandGeometry } from './programBandGeometry';
import { STUDIO_SCENE_COLORS, PROGRAM_USE_COLORS } from './studioVisualTokens';
import type { BuildingMass, ProgramBand, StudioPoint } from '@/lib/studio/types';

type StudioSceneProps = {
  mass: BuildingMass;
  showWireframe: boolean;
  showFloorBands: boolean;
  /** Faz 2A Task 4 — verilmezse (veya bos) sahne mevcut tek-renkli kutle
   * gorunumune zarifce geri doner, ekstra bir kod dali GEREKMEZ (bos
   * dizi zaten hicbir overlay uretmez). */
  programBands?: ProgramBand[];
  /** Faz 3A Task 5 bullet 1 — 2D yerlesim tahtasinin urettigi footprint.
   * `resolveEffectiveMass` ile `mass`e uygulanir (yalnizca yatay iz
   * degisir); verilmezse mevcut `mass.footprint.points` davranisi AYNEN
   * korunur. */
  footprintOverride?: StudioPoint[];
};

/**
 * Program bantlarini (`ProgramBand[]`) renkli, yari-saydam katmanlar olarak
 * ana kutlenin UZERINE bindirir — renderer HICBIR fizibilite/program hesabi
 * YAPMAZ (Global Constraint), yalnizca zaten hesaplanmis `mapProgramBandsToWorldY`
 * cikisini gorsellestirir. Z-fighting'i onlemek icin katmanlar ana kutleden
 * hafifce (%1.5) daha genis olceklenir — footprint'in kendisi degismez.
 */
function ProgramBandOverlays({ mass, bands }: { mass: BuildingMass; bands: ProgramBand[] }) {
  const segments = useMemo(() => mapProgramBandsToWorldY(bands, mass), [bands, mass]);

  if (segments.length === 0) return null;

  return (
    <group>
      {segments.map((segment) => {
        const geometry = createProgramBandGeometry(mass, segment);
        const centerY = (segment.bottomWorldY + segment.topWorldY) / 2;
        return (
          <mesh key={segment.band.id} geometry={geometry} position={[0, centerY, 0]} scale={[1.015, 1, 1.015]}>
            <meshBasicMaterial
              color={PROGRAM_USE_COLORS[segment.band.use]}
              transparent
              opacity={0.5}
              side={THREE.DoubleSide}
            />
          </mesh>
        );
      })}
    </group>
  );
}

function FloorBands({ mass, enabled }: { mass: BuildingMass; enabled: boolean }) {
  if (!enabled) return null;

  const levels = getFloorBandHeights(mass);

  return (
    <group>
      {levels.map((height) => (
        // Kok neden duzeltmesi (Faz 2A Task 4): `createMassGeometry`
        // merkezleme + MassMesh'in position.y=heightM/2 kaydirmasi sayesinde
        // kutlenin DUNYA Y araligi zaten [0, heightM]dir; bu halka AYNI
        // grubun dogrudan cocugu (ek donusum yok), yani position.y = world Y.
        // `getFloorBandHeights` zaten yer-goreli deger dondugu icin `height`
        // DOGRUDAN kullanilir — eski `- mass.heightM / 2` halkalari asagi
        // kaydirip bazilarini kutlenin ALTINA (negatif Y) dusuruyordu.
        <mesh key={height} position={[0, height, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[13.3, 13.55, 4]} />
          <meshBasicMaterial color={STUDIO_SCENE_COLORS.floorBand} transparent opacity={0.42} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

function MassMesh({ mass, showWireframe, showFloorBands, programBands = [], footprintOverride }: StudioSceneProps) {
  const effectiveMass = useMemo(() => resolveEffectiveMass(mass, footprintOverride), [mass, footprintOverride]);
  const geometry = useMemo(() => createMassGeometry(effectiveMass), [effectiveMass]);

  return (
    <group>
      <mesh geometry={geometry} position={[0, effectiveMass.heightM / 2, 0]}>
        <meshStandardMaterial color={STUDIO_SCENE_COLORS.massFill} roughness={0.58} metalness={0.08} transparent opacity={0.86} />
        <Edges color={STUDIO_SCENE_COLORS.massEdges} lineWidth={1.4} />
      </mesh>
      {showWireframe && (
        <mesh geometry={geometry} position={[0, effectiveMass.heightM / 2, 0]}>
          <meshBasicMaterial color={STUDIO_SCENE_COLORS.massWireframe} wireframe transparent opacity={0.28} />
        </mesh>
      )}
      <FloorBands mass={effectiveMass} enabled={showFloorBands} />
      <ProgramBandOverlays mass={effectiveMass} bands={programBands} />
    </group>
  );
}

export function StudioScene(props: StudioSceneProps) {
  // Sabit [42, 34, 42] her bina boyutu icin ayni kadraji kullaniyordu (kucuk
  // kutle mikroskobik, buyuk kutle kadraj disi kaliyordu). Kamera artik
  // kutlenin taban acikligina/yuksekligine gore deterministik konumlanir
  // (Faz 1B Task 1, bkz. studioCamera.ts).
  const effectiveMass = useMemo(
    () => resolveEffectiveMass(props.mass, props.footprintOverride),
    [props.mass, props.footprintOverride],
  );
  const view = useMemo(() => computeInitialCameraView(effectiveMass), [effectiveMass]);
  const distance = Math.hypot(...view.position);
  // prefers-reduced-motion: orbit inertia'sini (damping) kapat — kamera
  // her surukleme sonrasi kendi kendine "yavaslayarak durmak" yerine aninda
  // durur (Faz 1B Task 3).
  const reduceMotion = useReducedMotion();

  return (
    <Canvas
      camera={{ position: view.position, fov: 42 }}
      dpr={[1, 1.8]}
      gl={{ antialias: true, alpha: true }}
      // Sahne statik dururken surekli render tetiklemez — yalnizca orbit
      // etkilesimi veya prop degisiminde yeniden cizer (Faz 1B Task 4,
      // mobil GPU/pil yuku). OrbitControls "demand" modunu kendiliginden
      // destekler (drei), ek invalidate() cagrisi gerekmez.
      frameloop="demand"
    >
      <color attach="background" args={[STUDIO_SCENE_COLORS.background]} />
      <ambientLight intensity={0.7} />
      <directionalLight position={[18, 28, 16]} intensity={1.8} />
      <directionalLight position={[-12, 10, -10]} intensity={0.45} />
      <gridHelper args={[64, 16, STUDIO_SCENE_COLORS.gridMajor, STUDIO_SCENE_COLORS.gridMinor]} position={[0, -0.02, 0]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 0]}>
        <planeGeometry args={[56, 56]} />
        <meshStandardMaterial color={STUDIO_SCENE_COLORS.ground} roughness={0.9} />
      </mesh>
      <MassMesh {...props} />
      <OrbitControls
        makeDefault
        enablePan={false}
        // Sinirlar hesaplanan baslangic mesafesine ORANLI (sabit 18-95
        // degeri, hesaplanan mesafe 95'i asan buyuk kutlelerde OrbitControls
        // tarafindan sessizce kelepcelenip "deterministik kamera"yi
        // gecersiz kiliyordu).
        minDistance={distance * 0.35}
        maxDistance={distance * 2.5}
        // Zeminin altina gecmeyi/ters donmeyi sinirla (kullanici bulgusu:
        // kontrolsuz orbit kutlenin altini gosterip yon kaybettiriyordu).
        minPolarAngle={0.12}
        maxPolarAngle={Math.PI / 2 - 0.02}
        target={view.target}
        enableDamping={!reduceMotion}
      />
    </Canvas>
  );
}

