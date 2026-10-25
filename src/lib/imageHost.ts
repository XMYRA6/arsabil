/**
 * next/image yalnızca next.config.mjs `images.remotePatterns` içindeki host'ları
 * optimize edebilir (res.cloudinary.com). İlan `photos` alanı API'de doğrulanmadığı
 * için başka host gelebilir; o durumda `unoptimized` kullanılır (runtime hatası yok).
 */
export function isOptimizableHost(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && u.hostname === 'res.cloudinary.com';
  } catch {
    return false;
  }
}
