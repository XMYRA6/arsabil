/**
 * WebGL desteğini bir Canvas mount denemesi yapmadan önce tespit eder
 * (Faz 1B Task 3). `@react-three/fiber`'ın `Canvas`'ı WebGL yoksa iç
 * kütüphane hatası fırlatabilir; bunu render'dan önce bilmek, kullanıcıya
 * boş/kırık bir canvas yerine doğrudan erişilebilir HTML özet göstermeyi
 * sağlar.
 */
export function isWebGLAvailable(): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
  } catch {
    return false;
  }
}
