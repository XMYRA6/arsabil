"use client";

import { useEffect, useState } from "react";
import styles from "./SayfaGirisi.module.css";

// Modül düzeyi bayrak: ilk mount (tam sayfa yükleme) animasyonsuz geçer,
// sonraki rota değişimlerinde (template yeniden mount olur) fade oynar.
// Sunucuda ve ilk istemci render'ında sınıf eklenmez, hydration uyuşmazlığı olmaz.
let ilkMountGecti = false;

export function SayfaGirisi({ children }: { children: React.ReactNode }) {
  const [oynat] = useState(() => ilkMountGecti);

  useEffect(() => {
    ilkMountGecti = true;
  }, []);

  return <div className={oynat ? styles.oynat : undefined}>{children}</div>;
}
