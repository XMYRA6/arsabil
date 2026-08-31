import { matchAreaName } from './matchAreaName'
import type { AreaOption, ConvFields, ResolveResult } from './types'

export interface ResolveLocationDeps {
  fetchIlListesi: () => Promise<AreaOption[]>
  fetchIlceListesi: (ilId: number) => Promise<AreaOption[]>
  fetchMahalleListesi: (ilceId: number) => Promise<AreaOption[]>
}

function pick(
  level: 'il' | 'ilce' | 'mahalle',
  term: string,
  options: AreaOption[],
): { ok: true; option: AreaOption } | { ok: false; result: ResolveResult } {
  const m = matchAreaName(term, options)
  if (m.length === 0) return { ok: false, result: { kind: 'notfound', level, term } }
  if (m.length > 1) return { ok: false, result: { kind: 'ambiguous', level, candidates: m.slice(0, 3) } }
  return { ok: true, option: m[0] }
}

export async function resolveLocation(
  fields: ConvFields,
  deps: ResolveLocationDeps,
): Promise<ResolveResult> {
  let ilId = fields.ilId
  let ilText = fields.ilText ?? ''
  if (!ilId) {
    const r = pick('il', ilText, await deps.fetchIlListesi())
    if (!r.ok) return r.result
    ilId = r.option.id
    ilText = r.option.text
  }

  let ilceId = fields.ilceId
  let ilceText = fields.ilceText ?? ''
  if (!ilceId) {
    const r = pick('ilce', ilceText, await deps.fetchIlceListesi(ilId))
    if (!r.ok) return r.result
    ilceId = r.option.id
    ilceText = r.option.text
  }

  // fields.ilId / fields.ilceId skip mantığının aynısı mahalle için:
  // kullanıcı belirsizlik seçiminden mahalleId belirlediyse tekrar
  // (hâlâ belirsiz) mahalleText'ten çözmeye çalışma — sonsuz döngü olur.
  if (fields.mahalleId) {
    return {
      kind: 'resolved',
      mahalleId: fields.mahalleId,
      il: ilText,
      ilce: ilceText,
      mahalle: fields.mahalleText ?? '',
    }
  }

  const r = pick('mahalle', fields.mahalleText ?? '', await deps.fetchMahalleListesi(ilceId))
  if (!r.ok) return r.result
  return { kind: 'resolved', mahalleId: r.option.id, il: ilText, ilce: ilceText, mahalle: r.option.text }
}
