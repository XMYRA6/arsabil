export interface SdmxObservation {
  /**
   * Gözlemin coğrafi referans alanı (CL_IBBS kodu: il "TRxxx" / ilçe 4 haneli).
   * TÜİK ADNKS SDMX'inde bu değer CSV'nin **IKAMET_YERI** sütunundan gelir —
   * standart `REF_AREA` sütunu her satırda sabit `"TR"`'dir (bkz.
   * crawler/tuik/FINDINGS.md "Coğrafya").
   */
  refArea: string
  timePeriod: string
  value: number
}

/** Coğrafi kodu taşıyan boyut — TÜİK ADNKS'de REF_AREA değil IKAMET_YERI. */
const GEO_COLUMN = 'IKAMET_YERI'

function splitCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') inQuotes = !inQuotes
    else if (c === ',' && !inQuotes) { out.push(cur); cur = '' }
    else cur += c
  }
  out.push(cur)
  return out
}

const unquote = (s: string) => s.trim().replace(/^"|"$/g, '').trim()

/**
 * SDMX-CSV metnini gözlemlere çevirir.
 *
 * @param opts.filter  sütun adı → istenen değer. Her girdi için `row[col]` tam
 *   eşleşmeli; eşleşmeyen satır atlanır. Bir filtre sütunu başlıkta yoksa throw
 *   (yanlış dataflow/DSD'ye karşı erken uyarı — sessiz boş sonuç değil).
 */
export function parseSdmxCsv(
  csvText: string,
  opts: { filter?: Record<string, string> } = {},
): SdmxObservation[] {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0)
  if (lines.length < 2) return []

  const header = splitCsvLine(lines[0]).map(unquote)
  const iArea = header.indexOf(GEO_COLUMN)
  const iTime = header.indexOf('TIME_PERIOD')
  const iVal = header.indexOf('OBS_VALUE')
  if (iArea < 0 || iTime < 0 || iVal < 0) {
    throw new Error(
      `SDMX-CSV başlığında ${GEO_COLUMN}/TIME_PERIOD/OBS_VALUE eksik: ${header.join(',')}`,
    )
  }

  const filter = Object.entries(opts.filter ?? {}).map(([col, want]) => {
    const i = header.indexOf(col)
    if (i < 0) {
      throw new Error(
        `SDMX-CSV başlığında filtre sütunu yok: ${col} (başlık: ${header.join(',')})`,
      )
    }
    return [i, want] as const
  })

  const out: SdmxObservation[] = []
  for (const line of lines.slice(1)) {
    const cells = splitCsvLine(line)
    if (filter.some(([i, want]) => unquote(cells[i] ?? '') !== want)) continue

    const refArea = unquote(cells[iArea] ?? '')
    const timePeriod = unquote(cells[iTime] ?? '')
    const raw = unquote(cells[iVal] ?? '')
    if (!refArea || !raw) continue
    // Saf ondalık-virgül ("36,4") → nokta. Binlik ayırıcı YUTULMAZ: yalnız digits,digits.
    const norm = /^-?\d+,\d+$/.test(raw) ? raw.replace(',', '.') : raw
    const value = Number(norm)
    if (!Number.isFinite(value)) continue
    out.push({ refArea, timePeriod, value })
  }
  return out
}
