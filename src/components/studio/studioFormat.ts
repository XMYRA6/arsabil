/**
 * `StudioPreview.summaryGrid` ve `StudioFallback` AYNI `mass` kaynagindan
 * beslenir (Faz 1B Task 2 bullet 2); bicimleme kuralinin da tek kaynaktan
 * gelmesi, WebGL var/yok iki ayri UI dalinin ayni sayiyi farkli yuvarlayip
 * kullaniciyi kafasi karistirmasini engeller.
 */
export function formatStudioNumber(value: number): string {
  return value.toLocaleString('tr-TR', { maximumFractionDigits: 0 });
}
