export interface SdmxObservation {
  refArea: string
  timePeriod: string
  value: number
}

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

export function parseSdmxCsv(csvText: string): SdmxObservation[] {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0)
  if (lines.length < 2) return []

  const header = splitCsvLine(lines[0]).map(unquote)
  const iArea = header.indexOf('REF_AREA')
  const iTime = header.indexOf('TIME_PERIOD')
  const iVal = header.indexOf('OBS_VALUE')
  if (iArea < 0 || iTime < 0 || iVal < 0) {
    throw new Error(`SDMX-CSV başlığında REF_AREA/TIME_PERIOD/OBS_VALUE eksik: ${header.join(',')}`)
  }

  const out: SdmxObservation[] = []
  for (const line of lines.slice(1)) {
    const cells = splitCsvLine(line)
    const refArea = unquote(cells[iArea] ?? '')
    const timePeriod = unquote(cells[iTime] ?? '')
    const raw = unquote(cells[iVal] ?? '')
    if (!refArea || !raw) continue
    const value = Number(raw)
    if (!Number.isFinite(value)) continue
    out.push({ refArea, timePeriod, value })
  }
  return out
}
