'use client';

import * as THREE from 'three';
import { useMemo, useEffect } from 'react';
import { useThree } from '@react-three/fiber';

export interface VitrinCaptureResult {
  colorImageDataUrl: string;
  depthImageDataUrl: string;
  cameraPosition: [number, number, number];
}

export interface VitrinCaptureHandle {
  captureFrame(): VitrinCaptureResult;
}

export interface StudioVitrinCaptureProps {
  onCaptureReady?: (handle: VitrinCaptureHandle) => void;
}

/**
 * Canvas prop almaz — Canvas içine <StudioVitrinCapture onCaptureReady={...} />
 * olarak eklenir, useThree() ile aktif gl/scene/camera'ya erişir.
 *
 * NOT: forwardRef/useImperativeHandle DEĞİL, callback-prop deseni kullanılıyor —
 * next/dynamic({ssr:false})'in bu kod tabanındaki Next/React sürüm
 * kombinasyonunda ref'i çözümlenmiş forwardRef bileşenine iletmediği
 * (ref.current yerine dahili bir Suspense/Lazy "retry" nesnesine sabitlendiği)
 * ampirik olarak doğrulandı; düz prop'lar next/dynamic üzerinden sorunsuz
 * geçtiği için capture handle bir callback prop ile yukarı taşınıyor.
 *
 * Derinlik haritası ControlNet'in en sadık koşullama sinyali (spec §Mimari):
 * ayrı bir 3D modelleme adımı GEREKMEZ — sahne zaten gerçek 3D olduğu için
 * MeshDepthMaterial override ile aynı sahneyi ikinci kez render edip
 * doğrudan derinlik görüntüsü üretiyoruz, sonra kullanıcının gördüğü renkli
 * kareyi geri çiziyoruz (sahne capture sonrası bozuk/siyah kalmasın).
 */
export function StudioVitrinCapture({ onCaptureReady }: StudioVitrinCaptureProps) {
  const { gl, scene, camera } = useThree();

  const handle = useMemo<VitrinCaptureHandle>(
    () => ({
      captureFrame: () => {
        gl.render(scene, camera);
        const colorImageDataUrl = gl.domElement.toDataURL('image/png');

        const depthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.BasicDepthPacking });
        const prevOverride = scene.overrideMaterial;
        scene.overrideMaterial = depthMaterial;
        gl.render(scene, camera);
        const depthImageDataUrl = gl.domElement.toDataURL('image/png');
        scene.overrideMaterial = prevOverride;
        gl.render(scene, camera);
        depthMaterial.dispose();

        return {
          colorImageDataUrl,
          depthImageDataUrl,
          cameraPosition: [camera.position.x, camera.position.y, camera.position.z],
        };
      },
    }),
    [gl, scene, camera]
  );

  useEffect(() => {
    onCaptureReady?.(handle);
  }, [handle, onCaptureReady]);

  return null;
}
