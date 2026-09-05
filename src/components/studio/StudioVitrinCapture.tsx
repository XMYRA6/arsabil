'use client';

import * as THREE from 'three';
import { forwardRef, useImperativeHandle } from 'react';
import { useThree } from '@react-three/fiber';

export interface VitrinCaptureResult {
  colorImageDataUrl: string;
  depthImageDataUrl: string;
  cameraPosition: [number, number, number];
}

export interface VitrinCaptureHandle {
  captureFrame(): VitrinCaptureResult;
}

/**
 * Canvas prop almaz — Canvas içine <StudioVitrinCapture ref={...} /> olarak
 * eklenir, useThree() ile aktif gl/scene/camera'ya erişir.
 *
 * Derinlik haritası ControlNet'in en sadık koşullama sinyali (spec §Mimari):
 * ayrı bir 3D modelleme adımı GEREKMEZ — sahne zaten gerçek 3D olduğu için
 * MeshDepthMaterial override ile aynı sahneyi ikinci kez render edip
 * doğrudan derinlik görüntüsü üretiyoruz, sonra kullanıcının gördüğü renkli
 * kareyi geri çiziyoruz (sahne capture sonrası bozuk/siyah kalmasın).
 */
export const StudioVitrinCapture = forwardRef<VitrinCaptureHandle>(function StudioVitrinCapture(_props, ref) {
  const { gl, scene, camera } = useThree();

  useImperativeHandle(
    ref,
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

  return null;
});
