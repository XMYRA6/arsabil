"use client";

import { useEffect } from "react";

/**
 * iOS klavye kapandıktan sonra yerleşim viewport'u (window.innerHeight / 100dvh) bazen ESKİ,
 * küçük değerde kalır; gerçek görünür alan (visualViewport) ise tam boydur. `position:fixed`
 * alt çubuk bu yüzden yukarıda asılı kalır, elle kaydırınca düzelir. Aradaki farkı
 * `--vv-extra` (px, >= 0) olarak yayınlarız; alt çubuk ve Akif kabuğu bunu telafi eder.
 * Klavye AÇIKKEN 0 yazılır (o durum başka yerde ele alınıyor).
 */
export function ViewportGap() {
    useEffect(() => {
        const vv = window.visualViewport;
        if (!vv) return;
        const root = document.documentElement;
        const update = () => {
            const keyboardOpen = window.innerHeight - vv.height - vv.offsetTop > 80;
            const extra = keyboardOpen ? 0 : Math.round(vv.offsetTop + vv.height - window.innerHeight);
            root.style.setProperty("--vv-extra", `${Math.min(Math.max(extra, 0), 160)}px`);
        };
        const settle = () => [0, 100, 300, 700].forEach((ms) => window.setTimeout(update, ms));
        update();
        vv.addEventListener("resize", update);
        vv.addEventListener("scroll", update);
        window.addEventListener("resize", update);
        document.addEventListener("focusout", settle);
        return () => {
            vv.removeEventListener("resize", update);
            vv.removeEventListener("scroll", update);
            window.removeEventListener("resize", update);
            document.removeEventListener("focusout", settle);
            root.style.removeProperty("--vv-extra");
        };
    }, []);
    return null;
}
