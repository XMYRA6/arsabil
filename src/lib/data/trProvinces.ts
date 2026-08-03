export interface ProvinceDistrict {
  il: string;
  ilceler: string[];
  avgSalesPricePerM2: number;
  avgUnitConstructionPrice: number;
}

export const TURKEY_PROVINCES: ProvinceDistrict[] = [
  { il: "Adana", ilceler: ["Seyhan", "Çukurova", "Yüreğir", "Sarıçam", "Ceyhan", "Kozan"], avgSalesPricePerM2: 32000, avgUnitConstructionPrice: 22000 },
  { il: "Adıyaman", ilceler: ["Merkez", "Kahta", "Gölbaşı", "Besni"], avgSalesPricePerM2: 24000, avgUnitConstructionPrice: 20000 },
  { il: "Afyonkarahisar", ilceler: ["Merkez", "Sandıklı", "Dinar", "Bolvadin"], avgSalesPricePerM2: 26000, avgUnitConstructionPrice: 21000 },
  { il: "Ağrı", ilceler: ["Merkez", "Doğubayazıt", "Patnos"], avgSalesPricePerM2: 20000, avgUnitConstructionPrice: 19000 },
  { il: "Amasya", ilceler: ["Merkez", "Merzifon", "Suluova"], avgSalesPricePerM2: 25000, avgUnitConstructionPrice: 20000 },
  { il: "Ankara", ilceler: ["Çankaya", "Keçiören", "Yenimahalle", "Mamuk", "Etimesgut", "Sincan", "Gölbaşı"], avgSalesPricePerM2: 55000, avgUnitConstructionPrice: 28000 },
  { il: "Antalya", ilceler: ["Muratpaşa", "Konyaaltı", "Kepez", "Alanya", "Manavgat", "Kaş", "Kemer"], avgSalesPricePerM2: 65000, avgUnitConstructionPrice: 30000 },
  { il: "Artvin", ilceler: ["Merkez", "Hopa", "Borçka"], avgSalesPricePerM2: 28000, avgUnitConstructionPrice: 22000 },
  { il: "Aydın", ilceler: ["Efeler", "Kuşadası", "Didim", "Nazilli", "Söke"], avgSalesPricePerM2: 45000, avgUnitConstructionPrice: 25000 },
  { il: "Balıkesir", ilceler: ["Altıeylül", "Karesi", "Edremit", "Bandırma", "Ayvalık", "Burhaniye"], avgSalesPricePerM2: 40000, avgUnitConstructionPrice: 24000 },
  { il: "Bilecik", ilceler: ["Merkez", "Bozüyük"], avgSalesPricePerM2: 26000, avgUnitConstructionPrice: 21000 },
  { il: "Bingöl", ilceler: ["Merkez", "Genç"], avgSalesPricePerM2: 22000, avgUnitConstructionPrice: 19500 },
  { il: "Bitlis", ilceler: ["Merkez", "Tatvan", "Ahlat"], avgSalesPricePerM2: 22000, avgUnitConstructionPrice: 19500 },
  { il: "Bolu", ilceler: ["Merkez", "Gerede", "Göynük"], avgSalesPricePerM2: 32000, avgUnitConstructionPrice: 22000 },
  { il: "Burdur", ilceler: ["Merkez", "Bucak"], avgSalesPricePerM2: 27000, avgUnitConstructionPrice: 21000 },
  { il: "Bursa", ilceler: ["Nilüfer", "Osmangazi", "Yıldırım", "Mudanya", "Gemlik", "İnegöl"], avgSalesPricePerM2: 48000, avgUnitConstructionPrice: 26000 },
  { il: "Çanakkale", ilceler: ["Merkez", "Biga", "Gelibolu", "Ayvacık"], avgSalesPricePerM2: 42000, avgUnitConstructionPrice: 24000 },
  { il: "Çankırı", ilceler: ["Merkez", "Çerkeş"], avgSalesPricePerM2: 22000, avgUnitConstructionPrice: 19500 },
  { il: "Çorum", ilceler: ["Merkez", "Sungurlu", "Osmancık"], avgSalesPricePerM2: 26000, avgUnitConstructionPrice: 21000 },
  { il: "Denizli", ilceler: ["Pamukkale", "Merkezefendi", "Çivril"], avgSalesPricePerM2: 35000, avgUnitConstructionPrice: 23000 },
  { il: "Diyarbakır", ilceler: ["Kayapınar", "Yenişehir", "Bağlar", "Sur"], avgSalesPricePerM2: 30000, avgUnitConstructionPrice: 22000 },
  { il: "Edirne", ilceler: ["Merkez", "Keşan", "Uzunköprü"], avgSalesPricePerM2: 36000, avgUnitConstructionPrice: 23000 },
  { il: "Elazığ", ilceler: ["Merkez", "Kovancılar"], avgSalesPricePerM2: 26000, avgUnitConstructionPrice: 21000 },
  { il: "Erzincan", ilceler: ["Merkez", "Üzümlü"], avgSalesPricePerM2: 25000, avgUnitConstructionPrice: 20000 },
  { il: "Erzurum", ilceler: ["Yakutiye", "Palandöken", "Aziziye"], avgSalesPricePerM2: 28000, avgUnitConstructionPrice: 21500 },
  { il: "Eskişehir", ilceler: ["Odunpazarı", "Tepebaşı"], avgSalesPricePerM2: 40000, avgUnitConstructionPrice: 24000 },
  { il: "Gaziantep", ilceler: ["Şehitkamil", "Şahinbey"], avgSalesPricePerM2: 38000, avgUnitConstructionPrice: 24000 },
  { il: "Giresun", ilceler: ["Merkez", "Bulancak", "Görele"], avgSalesPricePerM2: 30000, avgUnitConstructionPrice: 22000 },
  { il: "Gümüşhane", ilceler: ["Merkez", "Kelkit"], avgSalesPricePerM2: 22000, avgUnitConstructionPrice: 19500 },
  { il: "Hakkari", ilceler: ["Merkez", "Yüksekova"], avgSalesPricePerM2: 20000, avgUnitConstructionPrice: 19000 },
  { il: "Hatay", ilceler: ["Antakya", "İskenderun", "Defne", "Dörtyol"], avgSalesPricePerM2: 28000, avgUnitConstructionPrice: 21000 },
  { il: "Isparta", ilceler: ["Merkez", "Eğirdir", "Yalvaç"], avgSalesPricePerM2: 30000, avgUnitConstructionPrice: 22000 },
  { il: "Mersin", ilceler: ["Yenişehir", "Mezitli", "Akdeniz", "Toroslar", "Tarsus", "Erdemli"], avgSalesPricePerM2: 38000, avgUnitConstructionPrice: 24000 },
  { il: "İstanbul", ilceler: ["Beşiktaş", "Kadıköy", "Şişli", "Sarıyer", "Üsküdar", "Bakırköy", "Ataşehir", "Ümraniye", "Maltepe", "Pendik", "Kartal", "Beylikdüzü", "Esenyurt"], avgSalesPricePerM2: 85000, avgUnitConstructionPrice: 35000 },
  { il: "İzmir", ilceler: ["Konak", "Karşıyaka", "Bornova", "Buca", "Çeşme", "Urla", "Gaziemir"], avgSalesPricePerM2: 60000, avgUnitConstructionPrice: 28000 },
  { il: "Kars", ilceler: ["Merkez", "Kağızman"], avgSalesPricePerM2: 22000, avgUnitConstructionPrice: 19500 },
  { il: "Kastamonu", ilceler: ["Merkez", "Tosya", "Taşköprü"], avgSalesPricePerM2: 25000, avgUnitConstructionPrice: 20000 },
  { il: "Kayseri", ilceler: ["Melikgazi", "Kocasinan", "Talas"], avgSalesPricePerM2: 32000, avgUnitConstructionPrice: 22000 },
  { il: "Kırklareli", ilceler: ["Merkez", "Lüleburgaz", "Babaeski"], avgSalesPricePerM2: 34000, avgUnitConstructionPrice: 22500 },
  { il: "Kırşehir", ilceler: ["Merkez", "Kaman"], avgSalesPricePerM2: 24000, avgUnitConstructionPrice: 20000 },
  { il: "Kocaeli", ilceler: ["İzmit", "Gebze", "Başiskele", "Golcük", "Kartepe", "Darıca"], avgSalesPricePerM2: 45000, avgUnitConstructionPrice: 25000 },
  { il: "Konya", ilceler: ["Selçuklu", "Meram", "Karatay", "Ereğli"], avgSalesPricePerM2: 34000, avgUnitConstructionPrice: 23000 },
  { il: "Kütahya", ilceler: ["Merkez", "Tavşanlı"], avgSalesPricePerM2: 25000, avgUnitConstructionPrice: 20000 },
  { il: "Malatya", ilceler: ["Battalgazi", "Yeşilyurt"], avgSalesPricePerM2: 28000, avgUnitConstructionPrice: 21000 },
  { il: "Manisa", ilceler: ["Yunusemre", "Şehzadeler", "Akhisar", "Turgutlu", "Salihli"], avgSalesPricePerM2: 36000, avgUnitConstructionPrice: 23000 },
  { il: "Kahramanmaraş", ilceler: ["Onikişubat", "Dulkadiroğlu", "Elbistan"], avgSalesPricePerM2: 26000, avgUnitConstructionPrice: 21000 },
  { il: "Mardin", ilceler: ["Artuklu", "Kızıltepe", "Midyat"], avgSalesPricePerM2: 25000, avgUnitConstructionPrice: 20000 },
  { il: "Muğla", ilceler: ["Bodrum", "Fethiye", "Marmaris", "Menteşe", "Milas", "Datça"], avgSalesPricePerM2: 75000, avgUnitConstructionPrice: 32000 },
  { il: "Muş", ilceler: ["Merkez", "Bulanık"], avgSalesPricePerM2: 20000, avgUnitConstructionPrice: 19000 },
  { il: "Nevşehir", ilceler: ["Merkez", "Ürgüp", "Avanos"], avgSalesPricePerM2: 32000, avgUnitConstructionPrice: 22000 },
  { il: "Niğde", ilceler: ["Merkez", "Bor"], avgSalesPricePerM2: 24000, avgUnitConstructionPrice: 20000 },
  { il: "Ordu", ilceler: ["Altınordu", "Ünye", "Fatsa"], avgSalesPricePerM2: 32000, avgUnitConstructionPrice: 22000 },
  { il: "Rize", ilceler: ["Merkez", "Çayeli", "Ardeşen"], avgSalesPricePerM2: 32000, avgUnitConstructionPrice: 22000 },
  { il: "Sakarya", ilceler: ["Adapazarı", "Serdivan", "Erenler", "Sapanca", "Karasu"], avgSalesPricePerM2: 40000, avgUnitConstructionPrice: 24000 },
  { il: "Samsun", ilceler: ["Atakum", "İlkadım", "Canik", "Bafra", "Çarşamba"], avgSalesPricePerM2: 38000, avgUnitConstructionPrice: 23500 },
  { il: "Siirt", ilceler: ["Merkez", "Kurtalan"], avgSalesPricePerM2: 22000, avgUnitConstructionPrice: 19500 },
  { il: "Sinop", ilceler: ["Merkez", "Boyabat"], avgSalesPricePerM2: 30000, avgUnitConstructionPrice: 21500 },
  { il: "Sivas", ilceler: ["Merkez", "Şarkışla"], avgSalesPricePerM2: 26000, avgUnitConstructionPrice: 21000 },
  { il: "Tekirdağ", ilceler: ["Süleymanpaşa", "Çorlu", "Çerkezköy", "Kapaklı"], avgSalesPricePerM2: 38000, avgUnitConstructionPrice: 24000 },
  { il: "Tokat", ilceler: ["Merkez", "Erbaa", "Niksar", "Turhal"], avgSalesPricePerM2: 26000, avgUnitConstructionPrice: 21000 },
  { il: "Trabzon", ilceler: ["Ortahisar", "Akçaabat", "Yomra", "Sürmene"], avgSalesPricePerM2: 35000, avgUnitConstructionPrice: 23000 },
  { il: "Tunceli", ilceler: ["Merkez"], avgSalesPricePerM2: 24000, avgUnitConstructionPrice: 20000 },
  { il: "Şanlıurfa", ilceler: ["Haliliye", "Karaköprü", "Eyyübiye", "Siverek"], avgSalesPricePerM2: 28000, avgUnitConstructionPrice: 21500 },
  { il: "Uşak", ilceler: ["Merkez", "Banaz"], avgSalesPricePerM2: 28000, avgUnitConstructionPrice: 21500 },
  { il: "Van", ilceler: ["İpekyolu", "Tuşba", "Edremit"], avgSalesPricePerM2: 26000, avgUnitConstructionPrice: 21000 },
  { il: "Yozgat", ilceler: ["Merkez", "Sorgun"], avgSalesPricePerM2: 22000, avgUnitConstructionPrice: 19500 },
  { il: "Zonguldak", ilceler: ["Merkez", "Ereğli", "Çaycuma"], avgSalesPricePerM2: 30000, avgUnitConstructionPrice: 22000 },
  { il: "Aksaray", ilceler: ["Merkez"], avgSalesPricePerM2: 26000, avgUnitConstructionPrice: 21000 },
  { il: "Bayburt", ilceler: ["Merkez"], avgSalesPricePerM2: 22000, avgUnitConstructionPrice: 19500 },
  { il: "Karaman", ilceler: ["Merkez"], avgSalesPricePerM2: 25000, avgUnitConstructionPrice: 20000 },
  { il: "Kırıkkale", ilceler: ["Merkez", "Yahşihan"], avgSalesPricePerM2: 26000, avgUnitConstructionPrice: 21000 },
  { il: "Batman", ilceler: ["Merkez"], avgSalesPricePerM2: 26000, avgUnitConstructionPrice: 21000 },
  { il: "Şırnak", ilceler: ["Merkez", "Cizre", "Silopi"], avgSalesPricePerM2: 22000, avgUnitConstructionPrice: 19500 },
  { il: "Bartın", ilceler: ["Merkez", "Amasra"], avgSalesPricePerM2: 28000, avgUnitConstructionPrice: 21500 },
  { il: "Ardahan", ilceler: ["Merkez"], avgSalesPricePerM2: 20000, avgUnitConstructionPrice: 19000 },
  { il: "Iğdır", ilceler: ["Merkez"], avgSalesPricePerM2: 22000, avgUnitConstructionPrice: 19500 },
  { il: "Yalova", ilceler: ["Merkez", "Çınarcık", "Altınova"], avgSalesPricePerM2: 42000, avgUnitConstructionPrice: 25000 },
  { il: "Karabük", ilceler: ["Merkez", "Safranbolu"], avgSalesPricePerM2: 28000, avgUnitConstructionPrice: 21500 },
  { il: "Kilis", ilceler: ["Merkez"], avgSalesPricePerM2: 22000, avgUnitConstructionPrice: 19500 },
  { il: "Osmaniye", ilceler: ["Merkez", "Kadirli"], avgSalesPricePerM2: 26000, avgUnitConstructionPrice: 21000 },
  { il: "Düzce", ilceler: ["Merkez", "Akçakoca"], avgSalesPricePerM2: 32000, avgUnitConstructionPrice: 22000 },
];

/** Flatten all 81 provinces and their districts into standard DistrictPriceEntry array */
export function getAllTurkeyDistrictPrices() {
  const entries: { id: string; il: string; ilce: string; avgSalesPricePerM2: number; avgUnitConstructionPrice: number }[] = [];
  let count = 1;

  for (const item of TURKEY_PROVINCES) {
    for (const ilce of item.ilceler) {
      entries.push({
        id: `tr-dist-${count++}`,
        il: item.il,
        ilce,
        avgSalesPricePerM2: item.avgSalesPricePerM2,
        avgUnitConstructionPrice: item.avgUnitConstructionPrice,
      });
    }
  }

  return entries;
}
