// TÜİK REF_AREA kodu → il/ilçe adı haritası.
//
// Task 1 (SDMX introspection) TÜİK kod listesinden (/rest/codelist/TR/<CL>/<ver>)
// üretir — TUIK_API_KEY gerektirir. O zamana kadar boş; resolveArea her kodu null
// döndürür, mergeDemographics hiç satır üretmez, crawl:tuik "datasets.ts boş" der.
//
// Yıllık tazelemede yeni ilçe eklenirse burası güncellenir (resolveArea bilinmeyen
// kodu null döndürüp CrawlRun.notes'a sayar).
//
// Örnek biçim (Task 1 doldurur):
//   "TR_IL_34":    { il: "İstanbul", ilce: null },
//   "TR_ILCE_3401": { il: "İstanbul", ilce: "Adalar" },

export const AREA_CODES: Record<string, { il: string; ilce: string | null }> = {}
