/**
 * Kayitli rapor PDF ozetinin (spec K6) icerik katmani — react-pdf'e HIC
 * bagimli degil, kasitli olarak. `SavedReportDocument.tsx` yalnizca burada
 * uretilen satirlari JSX'e donusturur; baska hicbir yerde ekstra satir
 * eklenmez. Bu ayrim, "yalnizca Report DB kaydinin sakladigi alanlar
 * basiliyor" garantisinin dogrudan (react-pdf'in ESM'i yuzunden jest'te
 * gercek <Document> agacini render etmeden) test edilebilmesini saglar.
 */

/** Yalnizca Report DB kaydinin GERCEKTEN sakladigi alanlar (bkz.
    prisma/schema.prisma `model Report` ve src/app/api/reports/route.ts).
    Motor ciktilari (M, FD_total disinda kalanlar, risk/iksa/marketPrice)
    bu kayitta hic persist edilmiyor; bu yuzden bu tipte YOK — spec K6
    karari geregi bu belge yalnizca elde var olan veriyi basar. */
export interface SavedReportInput {
  title: string;
  totalApartments: number;
  apartmentSizeSqm: number;
  luxLevelModifier: number;
  landShareRatio: number;
  minApartmentPrice: number;
  landCost: number;
}

export interface SavedReportRow {
  label: string;
  value: string;
}

const nf = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 });
const fmt   = (n: number) => nf.format(n);
const fmtTL = (n: number) => `${fmt(n)} TL`;

/**
 * Hero seridinde gosterilen 2 metrik. Belgenin bastigi icerigin bir parcasi
 * — "motor ciktilari gorunmuyor" garantisi bunun uzerinden test edilir.
 */
export function buildSavedReportHero(input: SavedReportInput): SavedReportRow[] {
  return [
    { label: 'Daire Fiyatı', value: fmtTL(input.minApartmentPrice) },
    // `landCost` DB'de result.FA || result.Ma olarak kaydediliyor (hangisi
    // oldugu belirsiz). Uygulamanin geri kalaninda (dashboard/reports/page.tsx)
    // bu alan zaten "Arsa Değeri" olarak etiketleniyor; ayni etiket burada da
    // kullanildi ki FA/Ma ihtimallerinden hangisi olursa olsun dogru kalsin.
    { label: 'Arsa Değeri', value: fmtTL(input.landCost) },
  ];
}

/**
 * Govde bolumundeki satirlar. `buildSavedReportHero` ile birlikte bu
 * fonksiyon, belgenin bastigi TUM alanlarin tam listesidir — Report
 * kaydinin sakladigi 7 alanin (title, totalApartments, apartmentSizeSqm,
 * luxLevelModifier, landShareRatio, minApartmentPrice, landCost) disinda
 * hicbir alan burada yer almaz.
 */
export function buildSavedReportRows(input: SavedReportInput): SavedReportRow[] {
  return [
    { label: 'Rapor Adı', value: input.title },
    { label: 'Daire Sayısı', value: `${fmt(input.totalApartments)} daire` },
    { label: 'Daire Alanı', value: `${fmt(input.apartmentSizeSqm)} m²` },
    { label: 'Arsa Payı', value: `%${(input.landShareRatio * 100).toFixed(0)}` },
    { label: 'Kalite Katsayısı', value: `x${input.luxLevelModifier}` },
  ];
}
