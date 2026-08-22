export type StudioPoint = {
  x: number;
  y: number;
};

export type ParcelGeometryStatus = 'valid' | 'invalid' | 'unavailable';

export type ParcelGeometrySourceKind = 'verified_tkgm' | 'user_drawn' | 'imported' | 'demo' | 'unavailable';

export type ParcelIdentity = {
  il?: string;
  ilce?: string;
  mahalle?: string;
  adaNo?: string;
  parselNo?: string;
};

export type ParcelGeometrySource = {
  source: ParcelGeometrySourceKind;
  status: ParcelGeometryStatus;
  parcelIdentity?: ParcelIdentity;
  areaM2?: number | null;
  polygon?: StudioPolygon | null;
  verifiedAt?: string;
  notes?: string;
};

export type StudioPolygon = {
  points: StudioPoint[];
  source: ParcelGeometrySourceKind;
  areaM2?: number | null;
  parcelIdentity?: ParcelIdentity;
  status?: ParcelGeometryStatus;
};

export type StudioWarning =
  | { code: 'MISSING_GROSS_CONSTRUCTION_AREA'; message: string }
  | { code: 'MISSING_GEOMETRY'; message: string }
  | { code: 'INVALID_GEOMETRY'; message: string }
  | { code: 'INVALID_AREA'; message: string }
  | { code: 'INVALID_FLOOR_COUNT'; message: string }
  | { code: 'AREA_MISMATCH'; message: string }
  | { code: 'DEMO_GEOMETRY'; message: string }
  | { code: 'NON_VERIFIED_VISUAL'; message: string }
  | { code: 'PROGRAM_AREA_EXCEEDS_AVAILABLE'; message: string }
  | { code: 'MISSING_COMMERCIAL_VALUE_ASSUMPTION'; message: string }
  | { code: 'MISSING_UNIT_VALUE_BASIS'; message: string }
  | { code: 'OVERLAPPING_PROGRAM_BANDS'; message: string }
  | { code: 'INVALID_PROGRAM_ITEM'; message: string }
  | { code: 'MANUAL_UNIT_COUNT_DIFFERS_FROM_AREA_ESTIMATE'; message: string }
  | { code: 'INVALID_VALUATION_METADATA'; message: string }
  | { code: 'LAYOUT_FOOTPRINT_TOO_SMALL'; message: string }
  | { code: 'LAYOUT_FOOTPRINT_OUTSIDE_PARCEL'; message: string }
  | { code: 'LAYOUT_FOOTPRINT_EXCEEDS_AREA_BUDGET'; message: string }
  | { code: 'LAYOUT_REFERENCES_UNKNOWN_PROGRAM_BAND'; message: string }
  | { code: 'OFFER_NEEDS_REBALANCE'; message: string }
  | { code: 'NEGATIVE_CASH_AMOUNT'; message: string }
  | { code: 'MISSING_VALUATION_BASIS'; message: string }
  | { code: 'CUSTOM_OFFER_HIDES_FRACTIONAL_BALANCE'; message: string }
  | { code: 'SCENARIO_SOURCE_CHANGED'; message: string }
  | { code: 'SCENARIO_LIMIT_EXCEEDED'; message: string };

export type ConstructionAreaSource = 'estimated_apartment_area' | 'authoritative';

export type StudioMassingInput = {
  parcelAreaM2: number | null;
  grossConstructionAreaM2: number | null;
  grossConstructionAreaSource: ConstructionAreaSource | null;
  floorHeightM?: number;
  assumedFloorCount?: number | null;
  parcelPolygon?: StudioPolygon | null;
};

export type BuildingMass = {
  footprint: StudioPolygon;
  heightM: number;
  floorCount: number;
  floorHeightM: number;
  grossConstructionAreaM2: number;
  warnings: StudioWarning[];
};

export type StudioSnapshotDraft = {
  schemaVersion: 1;
  sourceId?: string;
  createdAt: string;
  massingInput: StudioMassingInput;
  buildingMass: BuildingMass | null;
  warnings: StudioWarning[];
  parcelGeometrySource?: ParcelGeometrySourceKind | null;
  parcelIdentity?: ParcelIdentity;
  constructionAreaSource?: ConstructionAreaSource | null;
  programMix?: ProgramMixItem[];
  programSummary?: ProgramMixSummary;
  landownerOffer?: LandownerOfferOptions;
  valuationAssumptions?: ValuationAssumptions;
  layoutDraft?: StudioLayoutDraft;
};

// ---------------------------------------------------------------------------
// Faz 2 — Karma program (2+1/3+1/dukkan) ve teklif senaryolari
// ---------------------------------------------------------------------------

export type ProgramUse = 'residential' | 'commercial' | 'parking' | 'common';

export type ResidentialUnitType = '1+1' | '2+1' | '3+1' | '4+1' | 'custom';

/** Yapisal kat araligi — Faz 2A'nin `ProgramBand` kavramini Faz 2'nin
 * `ProgramMixItem`ina tasir (serbest metin degil, karsilastirilabilir
 * sayilar; cakisma kontrolu ve 3D kat-bandi eslemesi bunu gerektirir). */
export type FloorRange = {
  startFloor: number;
  endFloor: number;
};

/**
 * Bina alaninin bir dilimi (zemin dukkan bandi, bir daire tipi bloğu, ortak
 * alan/otopark bandi). `use==='residential'` disinda `residentialType`
 * anlamsizdir. Alan, `unitCount * unitAreaM2` olarak turetilir — ortak alan
 * gibi "birimsiz" bantlar icin `unitCount=1` kullanilir. `floorRange`
 * opsiyoneldir (henuz kata baglanmamis kalemler icin) ama verilince
 * `deriveProgramBands` ve 3D goruntu bunu kullanir.
 */
export type ProgramMixItem = {
  id: string;
  use: ProgramUse;
  residentialType?: ResidentialUnitType;
  unitCount: number;
  unitAreaM2: number;
  floorRange?: FloorRange;
  /** Faz 2A: kullanici `unitCount`u alan tahmininden turetilen oneriyi
   * degistirerek elle girdiyse true — snapshot'ta izlenebilir kalir. */
  manualOverride?: boolean;
};

export type ProgramMixSummary = {
  residentialUnitCountByType: Partial<Record<ResidentialUnitType, number>>;
  commercialUnitCount: number;
  commercialAreaM2: number;
  totalAllocatedAreaM2: number;
  /** `BuildingMass.grossConstructionAreaM2 - totalAllocatedAreaM2` — negatif
   * olabilir (asim), SESSIZCE KIRPILMAZ (Global Constraint). */
  remainingAreaM2: number;
  /** Konut+ticari (ortak alan/otopark HARIC) — Faz 2A'nin "satilabilir alan". */
  sellableAreaM2: number;
  warnings: StudioWarning[];
};

/** `ProgramMixItem[]`den turetilen, 3D sahnenin ve legend'in tukettigi
 * gorsel kat bandi (Faz 2A Task 1/4). Renderer BUNU hesaplamaz — saf
 * `deriveProgramBands` fonksiyonundan gelir. `colorSlotIndex` bir SOYUT
 * indekstir (gercek hex renk degil) — `src/lib/studio/*` UI/token
 * katmanina (`src/components/studio/studioVisualTokens.ts`) bagimli
 * olamaz; hex'e cevirme islemi UI tarafinda
 * `STUDIO_PROGRAM_COLOR_SLOTS[colorSlotIndex % slots.length]` ile yapilir. */
export type ProgramBand = {
  id: string;
  use: ProgramUse;
  floorRange: FloorRange;
  areaM2: number;
  colorSlotIndex: number;
};

/** Kesirli hak edisin (ornek: 9.2 daire) SESSIZCE yuvarlanmadan gosterilen,
 * seffaf teklif alternatifleri (spec: "senaryo", "on teklif" dili). */
export type LandownerOfferOption = {
  id: string;
  label: string;
  wholeUnitCount: number;
  fractionalUnitBalance: number;
  cashEqualizationTl: number | null;
};

export type LandownerOfferOptions = {
  entitledUnitCount: number;
  wholeUnitCount: number;
  fractionalUnitBalance: number;
  options: LandownerOfferOption[];
  warnings: StudioWarning[];
};

/** Zemin kat dukkan/kiralik ticari bant girdisi (Faz 2 Task 2). */
export type CommercialScenarioInput = {
  shopCount: number;
  averageShopAreaM2: number;
  valueBasis: 'rent' | 'sale' | null;
  rentMonthlyPerM2Tl?: number | null;
  saleValuePerM2Tl?: number | null;
  availableGroundFloorAreaM2: number;
};

export type CommercialScenarioSummary = {
  shopCount: number;
  totalShopAreaM2: number;
  valueBasis: 'rent' | 'sale' | null;
  estimatedMonthlyRentTl: number | null;
  estimatedSaleValueTl: number | null;
  exceedsAvailableArea: boolean;
  warnings: StudioWarning[];
};

/**
 * Faz 2B Task 1 (re-scoped) — Faz 2'nin `createLandownerOfferOptions`ina
 * verilen tek `unitValueTl` sayisini zenginlestiren EKLEMELI metadata.
 * Global Constraint: para birimi/tarih GIZLI SABIT olmaz — her ikisi de
 * zorunlu alan (opsiyonel degil).
 */
export type ValuationAssumptions = {
  currency: string;
  valuationDate: string;
  unitValueTl: number | null;
  unitValuePerM2Tl?: number | null;
  shopValueTl?: number | null;
  shopRentMultiplierMonthly?: number | null;
};

// ---------------------------------------------------------------------------
// Faz 3A — Kontrollu 2D yerlesim tahtasi
// ---------------------------------------------------------------------------

/**
 * Footprint SERBEST NOKTA LISTESI DEGIL (Task 1 karari) — resmi parsel
 * sinirini (`StudioMassingInput.parcelPolygon`) DEGISTIRMEZ (Global
 * Constraint), yalnizca onun uzerine bindirilen bir ONERI'yi merkez/donus/
 * olcek/inset parametreleriyle temsil eder. Gercek poligonu Faz 3A Task 2
 * (`geometry2d.ts`) turetir; bu tip yalnizca serbestce serilestirilebilir
 * (JSON-safe) girdiyi tutar.
 */
export type FootprintDraft = {
  centerX: number;
  centerY: number;
  rotationDeg: number;
  /** 1 = mevcut kutle footprint'iyle ayni boyut; parsel sinirini asmamak
   * icin genelde <=1 kalmasi beklenir (bkz. `validateLayoutDraft`). */
  scale: number;
  insetM?: number;
};

/** Cekme mesafesi VARSAYIMI — resmi imar cekme cizgisi degil, kullaniciya
 * gorsel referans icin (Global Constraint: CAD/imar araci degil). */
export type SetbackAssumption = {
  frontM: number;
  sideM: number;
  rearM: number;
};

/** Zemin kat ticaret cephesinin footprint kenarina gore konumu. */
export type CommercialFrontageDraft = {
  edgeIndex: number;
  lengthM: number;
};

/**
 * 2D yerlesim taslaginin tamami — serilestirilebilir state (snapshot'a
 * eklenir, Task 5). Program bantlarina KOPYALAMADAN, yalnizca
 * `ProgramBand.id` REFERANSIYLA baglanir (Faz 2A'nin `colorSlotIndex`
 * soyutlamasindaki AYNI ilke: lib katmani UI/gorsel veriyi duplicate etmez).
 */
export type StudioLayoutDraft = {
  footprint: FootprintDraft;
  setback: SetbackAssumption;
  commercialFrontage?: CommercialFrontageDraft;
  programBandIds: string[];
};

// ---------------------------------------------------------------------------
// Faz 3B — Senaryo Taslagi, Gecmis ve Karsilastirma
// ---------------------------------------------------------------------------

export type BaseSnapshotReference = {
  sourceId?: string;
  parcelAreaM2: number | null;
  grossConstructionAreaM2: number | null;
  parcelGeometrySource?: ParcelGeometrySourceKind | null;
  hash?: string;
};

export type CustomOfferOverride = {
  unitCount: number;
  cashTl: number;
};

/**
 * Tarayici oturumu icindeki serilestirilebilir senaryo taslagi (Faz 3B).
 * Server persistence yoktur; "bu oturumda taslak" dilini kullanir.
 */
export type StudioScenarioDraft = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  baseSnapshotRef: BaseSnapshotReference;
  layout: StudioLayoutDraft | null;
  programMix: ProgramMixItem[];
  valuationAssumptions: ValuationAssumptions | null;
  customOffer: CustomOfferOverride | null;
  notes?: string;
};

/**
 * Deterministic command tipleri — layout, program, teklif ve varsayim
 * degisikliklerini temsil eder (Faz 3B Task 1).
 */
export type ScenarioCommand =
  | { type: 'SET_LAYOUT'; payload: { layout: StudioLayoutDraft | null } }
  | { type: 'UPDATE_LAYOUT_FOOTPRINT'; payload: { footprint: FootprintDraft } }
  | { type: 'SET_PROGRAM_MIX'; payload: { items: ProgramMixItem[] } }
  | { type: 'UPDATE_PROGRAM_ITEM'; payload: { item: ProgramMixItem } }
  | { type: 'ADD_PROGRAM_ITEM'; payload: { item: ProgramMixItem } }
  | { type: 'REMOVE_PROGRAM_ITEM'; payload: { itemId: string } }
  | { type: 'SET_VALUATION_ASSUMPTIONS'; payload: { assumptions: ValuationAssumptions | null } }
  | { type: 'SET_CUSTOM_OFFER'; payload: { customOffer: CustomOfferOverride | null } }
  | { type: 'SET_SCENARIO_NAME'; payload: { name: string } }
  | { type: 'SET_SCENARIO_NOTES'; payload: { notes: string } };

export type ScenarioHistoryEntry = {
  id: string;
  command: ScenarioCommand;
  label: string;
  timestamp: string;
  snapshot: StudioScenarioDraft;
};

export type ScenarioHistoryState = {
  past: ScenarioHistoryEntry[];
  present: StudioScenarioDraft;
  future: ScenarioHistoryEntry[];
  initialDraft: StudioScenarioDraft;
  maxDepth: number;
};




