export interface TabRect {
    left: number;
    width: number;
}

export function hesaplaGosterge(rects: TabRect[], aktifIndex: number): { x: number; width: number } | null {
    if (aktifIndex < 0) return null;
    const r = rects[aktifIndex];
    if (!r) return null;
    return { x: r.left, width: r.width };
}
