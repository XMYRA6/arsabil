'use client';

import React, { useMemo, useState, useEffect, Suspense } from 'react';
import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, useTexture } from '@react-three/drei';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { generateProceduralFacade, type FacadeWall } from '@/lib/studio/proceduralFacade';
import { generateSiteContext, selectRoadEdge, type SiteContextPlacement, type RoadPlacement } from '@/lib/studio/siteContext';
import { createMassGeometry, resolveEffectiveMass } from './buildMassGeometry';
import { computeInitialCameraView } from './studioCamera';
import { deriveFootprintPolygon } from '@/lib/studio/geometry2d';
import { STUDIO_SCENE_COLORS } from './studioVisualTokens';
import { StudioVitrinCapture, type VitrinCaptureHandle } from './StudioVitrinCapture';
import type { StudioSnapshotDraft, StudioPoint, BuildingMass, StudioPolygon } from '@/lib/studio/types';

export interface StudioVitrinSceneProps {
  snapshot: StudioSnapshotDraft;
  onCaptureReady?: (handle: VitrinCaptureHandle) => void;
}

/**
 * Pencerelerin ve çerçevelerin prosedürel 3D mesh'lerini üretir.
 */
function FacadeWindowsMesh({ walls }: { walls: FacadeWall[] }) {
  const windowElements = useMemo(() => {
    const elements: React.ReactNode[] = [];

    walls.forEach((wall, wallIdx) => {
      if (wall.lengthM <= 0 || wall.windows.length === 0) return;

      const dx = (wall.end.x - wall.start.x) / wall.lengthM;
      const dy = (wall.end.y - wall.start.y) / wall.lengthM;
      // Normal vektör (duvara dik dışa doğru)
      const nx = -dy;
      const ny = dx;
      const angleY = Math.atan2(dx, dy);

      wall.windows.forEach((win, winIdx) => {
        const posX = wall.start.x + dx * (win.x + win.width / 2) + nx * 0.08;
        const posZ = wall.start.y + dy * (win.x + win.width / 2) + ny * 0.08;
        const posY = win.y + win.height / 2;

        elements.push(
          <group key={`win-${wallIdx}-${winIdx}`} position={[posX, posY, posZ]} rotation={[0, angleY, 0]}>
            {/* Cam Panel */}
            <mesh>
              <boxGeometry args={[win.width, win.height, 0.06]} />
              <meshPhysicalMaterial
                color="#7dd3fc"
                transmission={0.65}
                roughness={0.12}
                metalness={0.15}
                ior={1.48}
                envMapIntensity={1.4}
                transparent
                opacity={0.88}
              />
            </mesh>
            {/* Pencere Çerçevesi / Söve */}
            <mesh>
              <boxGeometry args={[win.width + 0.08, win.height + 0.08, 0.04]} />
              <meshStandardMaterial color="#334155" roughness={0.7} metalness={0.2} />
            </mesh>
          </group>
        );
      });
    });

    return elements;
  }, [walls]);

  return <group>{windowElements}</group>;
}

/**
 * Site bağlamındaki ağaçları GLB modellerinden asenkron yükler.
 * Hata durumunda sahneyi çökertmeden sessizce atlar (onError / .catch).
 */
function SiteTreesMesh({ placements }: { placements: SiteContextPlacement[] }) {
  const [treeModels, setTreeModels] = useState<Record<string, THREE.Group | null>>({});

  useEffect(() => {
    // Poly Haven'dan indirilen agac GLB'leri Draco-sikistirilmis geometri
    // icerir; DRACOLoader baglanmazsa yukleme SESSIZCE (onError ile) HER
    // ZAMAN basarisiz olur ve sahne daima basit koni/silindir fallback'e
    // duser. Cozucu dosyalari self-host edilir (public/studio-assets/draco/),
    // dis bir CDN'e baglanilmaz.
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('/studio-assets/draco/');
    const loader = new GLTFLoader();
    loader.setDRACOLoader(dracoLoader);
    const loaded: Record<string, THREE.Group | null> = {};

    const loadAsset = (assetId: string, path: string) => {
      return new Promise<void>((resolve) => {
        loader.load(
          path,
          (gltf) => {
            loaded[assetId] = gltf.scene;
            resolve();
          },
          undefined,
          (err) => {
            console.warn(`[StudioVitrin] Asset yüklenemedi (${path}):`, err);
            loaded[assetId] = null;
            resolve();
          }
        );
      });
    };

    Promise.all([
      loadAsset('tree-01', '/studio-assets/trees/tree-01.glb'),
      loadAsset('tree-02', '/studio-assets/trees/tree-02.glb'),
    ])
      .then(() => {
        setTreeModels(loaded);
      })
      .catch((err) => {
        console.warn('[StudioVitrin] Ağaç modelleri yükleme hatası:', err);
      });

    return () => {
      dracoLoader.dispose();
    };
  }, []);

  if (placements.length === 0) return null;

  return (
    <group>
      {placements.map((p, idx) => {
        const model = treeModels[p.assetId];
        if (!model) {
          // Fallback basit geometrik ağaç (GLB henüz yüklenmediyse veya başarısız olduysa)
          return (
            <group key={`tree-fb-${idx}`} position={[p.x, 0, p.y]}>
              <mesh position={[0, 1.2, 0]}>
                <cylinderGeometry args={[0.15, 0.25, 2.4, 6]} />
                <meshStandardMaterial color="#78350f" roughness={0.9} />
              </mesh>
              <mesh position={[0, 2.8, 0]}>
                <coneGeometry args={[1.2, 2.8, 6]} />
                <meshStandardMaterial color="#15803d" roughness={0.8} />
              </mesh>
            </group>
          );
        }

        const clone = model.clone();
        return (
          <primitive
            key={`tree-${idx}`}
            object={clone}
            position={[p.x, 0, p.y]}
            rotation={[0, (p.rotationDeg * Math.PI) / 180, 0]}
            scale={[1.2, 1.2, 1.2]}
          />
        );
      })}
    </group>
  );
}

/**
 * Parsel önündeki yolu dokulu bir şerit olarak yerleştirir.
 */
function RoadMesh({ road }: { road: RoadPlacement }) {
  const { geometry, posX, posZ, angleY, length } = useMemo(() => {
    const length = Math.hypot(road.edgeEnd.x - road.edgeStart.x, road.edgeEnd.y - road.edgeStart.y);
    const angleY = Math.atan2(road.edgeEnd.x - road.edgeStart.x, road.edgeEnd.y - road.edgeStart.y);
    const posX = (road.edgeStart.x + road.edgeEnd.x) / 2;
    const posZ = (road.edgeStart.y + road.edgeEnd.y) / 2;

    const geo = new THREE.PlaneGeometry(road.widthM, length);
    return { geometry: geo, posX, posZ, angleY, length };
  }, [road]);

  // useTexture (Suspense-tabanlı) bilerek kullanılıyor: THREE.TextureLoader().load()
  // dokuyu HEMEN (boş) döndürüp resmi arka planda asenkron indirir — setState o an
  // tetiklenirse frameloop="demand" altında tek bir kare boş dokuyla çizilir, resim
  // gerçekten gelince Three'nin needsUpdate'i React dışında gerçekleştiği için bir
  // daha invalidate tetiklenmez ve yol dokusuz/siyah kalır. useTexture, resim TAM
  // yüklenene kadar suspend eder; component ilk kez render olduğunda doku zaten hazırdır.
  const [diffuse, normal, roughness] = useTexture([
    '/studio-assets/materials/road-asphalt/diffuse.jpg',
    '/studio-assets/materials/road-asphalt/normal.jpg',
    '/studio-assets/materials/road-asphalt/roughness.jpg',
  ]);

  useMemo(() => {
    [diffuse, normal, roughness].forEach((t) => {
      t.wrapS = THREE.RepeatWrapping;
      t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(1, Math.max(1, Math.round(length / 4)));
    });
  }, [diffuse, normal, roughness, length]);

  return (
    <mesh
      geometry={geometry}
      position={[posX, 0.01, posZ]}
      rotation={[-Math.PI / 2, 0, -angleY]}
    >
      {/* color BEYAZ kalmali: THREE `map * color` carpar, koyu bir tint
          (onceki #334155) zaten koyu olan asfalt fotografini duz siyaha
          kadar kisiyordu — doku hala oradaydi ama gorunmuyordu (gercek
          GPU'da dogrulandi: color=#ffffff ile aynı dokuda görünür kontrast). */}
      <meshStandardMaterial
        color="#ffffff"
        map={diffuse}
        normalMap={normal}
        roughnessMap={roughness}
        roughness={0.88}
        metalness={0.05}
      />
    </mesh>
  );
}

/**
 * PBR materyalli ana bina kütlesi.
 */
function VitrinMassMesh({ mass }: { mass: BuildingMass }) {
  const geometry = useMemo(() => createMassGeometry(mass), [mass]);

  return (
    <mesh geometry={geometry} position={[0, mass.heightM / 2, 0]} castShadow receiveShadow>
      <meshStandardMaterial
        color={STUDIO_SCENE_COLORS.massFill}
        roughness={0.45}
        metalness={0.12}
        envMapIntensity={0.8}
      />
    </mesh>
  );
}

export function StudioVitrinScene({ snapshot, onCaptureReady }: StudioVitrinSceneProps) {
  const mass = snapshot.buildingMass;
  const parcelPolygon = snapshot.massingInput.parcelPolygon;

  const effectiveMass = useMemo(() => {
    if (!mass) return null;
    const footprintOverride = snapshot.layoutDraft
      ? deriveFootprintPolygon(mass.footprint.points, snapshot.layoutDraft.footprint)
      : undefined;
    return resolveEffectiveMass(mass, footprintOverride);
  }, [mass, snapshot.layoutDraft]);

  const facadeWalls = useMemo(() => {
    if (!effectiveMass) return [];
    return generateProceduralFacade(effectiveMass);
  }, [effectiveMass]);

  const sitePlacements = useMemo(() => {
    if (!parcelPolygon || !effectiveMass) return [];
    return generateSiteContext(parcelPolygon, effectiveMass, snapshot.layoutDraft);
  }, [parcelPolygon, effectiveMass, snapshot.layoutDraft]);

  const roadPlacement = useMemo(() => {
    if (!parcelPolygon) return null;
    return selectRoadEdge(parcelPolygon);
  }, [parcelPolygon]);

  const cameraView = useMemo(() => {
    if (!effectiveMass) return { position: [30, 24, 30] as [number, number, number], target: [0, 5, 0] as [number, number, number] };
    return computeInitialCameraView(effectiveMass);
  }, [effectiveMass]);

  if (!effectiveMass) {
    return null;
  }

  const distance = Math.hypot(...cameraView.position);

  return (
    <Canvas
      camera={{ position: cameraView.position, fov: 40 }}
      dpr={[1, 1.8]}
      gl={{ antialias: true, alpha: true }}
      frameloop="demand"
    >
      <color attach="background" args={[STUDIO_SCENE_COLORS.background]} />

      {/* HDRI Ortam Işığı — Suspense KENDİ sınırında: Environment'ın HDR
          yükleme/çözme süresi, aynı Suspense sınırını paylaşan diğer
          mesh'lerin (bina/pencere/ağaç/yol) görünür olmasını ENGELLEMEMELİ. */}
      <Suspense fallback={null}>
        <Environment files="/studio-assets/hdri/outdoor-env.hdr" background={false} />
      </Suspense>

      {/* Güneş ve Dolgu Işıkları */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[24, 36, 20]} intensity={1.6} castShadow />
      <directionalLight position={[-16, 12, -14]} intensity={0.4} />

      {/* Zemin Izgarası & Parsel Düzlemi */}
      <gridHelper args={[80, 20, STUDIO_SCENE_COLORS.gridMajor, STUDIO_SCENE_COLORS.gridMinor]} position={[0, -0.01, 0]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[70, 70]} />
        <meshStandardMaterial color={STUDIO_SCENE_COLORS.ground} roughness={0.92} metalness={0.02} />
      </mesh>

      {/* 1. Ana Bina Kütlesi */}
      <VitrinMassMesh mass={effectiveMass} />

      {/* 2. Prosedürel Pencereler */}
      <FacadeWindowsMesh walls={facadeWalls} />

      {/* 3. Site Bağlamı Ağaçları */}
      <SiteTreesMesh placements={sitePlacements} />

      {/* 4. Yol Şeridi — kendi Suspense sınırında: doku yükleme süresi diğer
          mesh'lerin görünür olmasını engellememeli (Environment ile aynı desen). */}
      {roadPlacement && (
        <Suspense fallback={null}>
          <RoadMesh road={roadPlacement} />
        </Suspense>
      )}

      {/* Kamera Kontrolleri */}
      <OrbitControls
        makeDefault
        enablePan={false}
        minDistance={distance * 0.35}
        maxDistance={distance * 2.5}
        minPolarAngle={0.1}
        maxPolarAngle={Math.PI / 2 - 0.02}
        target={cameraView.target}
        enableDamping
      />

      {/* 5. Yakalama Köprüsü — Canvas dışına capture API sunar (Task 8 tüketir) */}
      <StudioVitrinCapture onCaptureReady={onCaptureReady} />
    </Canvas>
  );
}
