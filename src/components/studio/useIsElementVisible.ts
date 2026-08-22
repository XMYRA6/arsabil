'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * `StudioScene`in `frameloop="demand"` olsa bile OrbitControls damping/
 * resize gibi olaylarla panel ekran disindayken bile GPU'yu meşgul edebilir.
 * Panel gorunum disina ciktiginda `StudioPreview` sahneyi tamamen SOKER
 * (Faz 1B Task 4 bullet 3) — bu hook o gorunurlugu izler.
 *
 * Callback ref DONER (adi `setNode`), duz `useRef` DONMEZ: gozlenen eleman
 * kosullu render edilir (yalnizca sahne acikken mount olur) — sabit bir
 * `RefObject` ile efekt yalnizca bilesen mount olurken (eleman henuz DOM'da
 * degilken) calisir ve eleman sonradan monte olunca asla yeniden
 * gozlemlenmezdi. Callback ref, eleman her ATTACH/DETACH olduğunda
 * (React tarafindan) yeniden cagrilir; observer kurulumu/sokulmesi buna
 * baglanir.
 *
 * Ilk olcum tamamlanana kadar `true` doner: aksi halde panel mount olur
 * olmaz (IntersectionObserver henuz raporlamadan) bir an icin yanlislikla
 * "gorunmez" sanilip sahne hic acilmadan kapanabilirdi.
 */
export function useIsElementVisible(): [(node: Element | null) => void, boolean] {
  const [isVisible, setIsVisible] = useState(true);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const setNode = useCallback((node: Element | null) => {
    observerRef.current?.disconnect();
    observerRef.current = null;

    if (!node || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.01 },
    );
    observer.observe(node);
    observerRef.current = observer;
  }, []);

  useEffect(() => () => observerRef.current?.disconnect(), []);

  return [setNode, isVisible];
}
