// Akif-1 Tool Gateway — imar/arsa terimleri için SABİT sözlük.
// Amaç: LLM'in terminoloji uydurmasını engellemek. Bu metinler DÜZ sözlük
// tanımıdır; Akif'in karakteri/şivesi burada DEĞİL, orchestrator'ın `speech`
// alanındadır.

export type AkifTerm =
  | 'emsal'
  | 'taks'
  | 'kaks'
  | 'kat_karsiligi'
  | 'arsa_payi'
  | 'iksa'
  | 'risk_katsayisi'

export const GLOSSARY: Record<AkifTerm, { shortDef: string; example: string }> = {
  emsal: {
    shortDef:
      'Emsal (KAKS ile aynı şey), bir arsaya yapılabilecek toplam inşaat alanının arsa alanına oranıdır. Arsanın ne kadar yapı hakkı taşıdığını gösterir.',
    example:
      'Emsal 1,50 ise 1.000 m² arsada toplam 1.500 m² inşaat alanı yapılabilir.',
  },
  taks: {
    shortDef:
      'TAKS (Taban Alanı Kat Sayısı), binanın zemine oturan taban alanının arsa alanına oranıdır. Arsanın en fazla ne kadarının bina tabanıyla kapatılabileceğini sınırlar.',
    example:
      'TAKS 0,40 ise 1.000 m² arsada binanın zemindeki oturumu en fazla 400 m² olabilir; kalan alan bahçe, otopark ve çekme mesafesidir.',
  },
  kaks: {
    shortDef:
      'KAKS (Kat Alanı Kat Sayısı) emsal ile aynı kavramdır: toplam inşaat alanının arsa alanına oranı. İki terim birbirinin yerine kullanılır.',
    example:
      'KAKS 2,00 olan 500 m² arsada toplam 1.000 m² inşaat alanı yapılabilir.',
  },
  kat_karsiligi: {
    shortDef:
      'Kat karşılığı, arsa sahibinin arsasını bir müteahhide verip karşılığında inşa edilen bağımsız bölümlerden (daire, dükkan) pay aldığı yapım modelidir. Kural olarak para el değiştirmez, bitmiş bağımsız bölümler paylaşılır.',
    example:
      '8 daire çıkacak bir binada "%50 kat karşılığı" anlaşmasında arsa sahibi 4 daire, müteahhit 4 daire alır.',
  },
  arsa_payi: {
    shortDef:
      'Arsa payı (kat karşılığı bağlamında), inşa edilen bağımsız bölümlerin arsa sahibine düşen oranıdır. Müteahhidin arsa sahibine verdiği payı ifade eder.',
    example:
      'Arsa payı %50 ise ve binadan 10 daire çıkıyorsa arsa sahibine 5 daire, müteahhide 5 daire düşer.',
  },
  iksa: {
    shortDef:
      'İksa, derin temel veya bodrum kazısı sırasında kazı çukurunun kaymasını önleyen ve komşu yapıları güvene alan istinat/destekleme sistemidir. İnşaat bütçesinde ayrı bir maliyet kalemidir.',
    example:
      'Yola ve komşu binaya bitişik bir parselde 3 kat bodrum kazısı için fore kazık ve ankrajlı iksa yapılması, kaba inşaata başlamadan önce ek maliyet doğurur.',
  },
  risk_katsayisi: {
    shortDef:
      'Risk katsayısı, ArsaBil hesabında inşaat maliyetini artıran bir çarpandır. Zemin, deprem, ulaşım/lojistik gibi zorlaştırıcı koşulları maliyete yansıtmak için kullanılır.',
    example:
      'Risk katsayısı 1,05 ise, temel inşaat maliyetinin üzerine %5 ek maliyet eklenir (100 birim maliyet → 105 birim).',
  },
}
