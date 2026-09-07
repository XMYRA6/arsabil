import { mergeDemographics, type DataflowResult } from '../../tuik/merge'
import type { ResolvedArea } from '../../tuik/areaCodes'

const RES: Record<string, ResolvedArea> = {
  IL_TRABZON: { il: 'Trabzon', ilce: null },
  ILCE_ORTAHISAR: { il: 'Trabzon', ilce: 'Ortahisar' },
  ILCE_AKCAABAT: { il: 'Trabzon', ilce: 'Akçaabat' },
  ILCE_ISTANBUL_SISLI: { il: 'İstanbul', ilce: 'Şişli' },
}
const resolve = (code: string) => RES[code] ?? null

const dfRef = (key: string, field: any, level: 'il' | 'ilce') => ({
  key, dataflow: key, version: '1.1', field, level, keyDimensions: {},
})

describe('mergeDemographics', () => {
  it('ilçe-seviyesi gözlemler ilçe satırına yazılır', () => {
    const results: DataflowResult[] = [{
      ref: dfRef('population', 'population', 'ilce'),
      observations: [
        { refArea: 'ILCE_ORTAHISAR', timePeriod: '2024', value: 320000 },
        { refArea: 'ILCE_AKCAABAT', timePeriod: '2024', value: 130000 },
      ],
    }]
    expect(mergeDemographics(results, resolve)).toEqual([
      { il: 'TRABZON', ilce: 'ORTAHISAR', population: 320000 },
      { il: 'TRABZON', ilce: 'AKÇAABAT', population: 130000 },
    ])
  })

  it('il-seviyesi gözlem, o ilin TÜM (mevcut) ilçelerine yayılır', () => {
    const results: DataflowResult[] = [
      {
        ref: dfRef('population', 'population', 'ilce'),
        observations: [
          { refArea: 'ILCE_ORTAHISAR', timePeriod: '2024', value: 320000 },
          { refArea: 'ILCE_AKCAABAT', timePeriod: '2024', value: 130000 },
        ],
      },
      {
        ref: dfRef('medianAge', 'medianAge', 'il'),
        observations: [{ refArea: 'IL_TRABZON', timePeriod: '2024', value: 36.4 }],
      },
    ]
    expect(mergeDemographics(results, resolve)).toEqual([
      { il: 'TRABZON', ilce: 'ORTAHISAR', population: 320000, medianAge: 36.4 },
      { il: 'TRABZON', ilce: 'AKÇAABAT', population: 130000, medianAge: 36.4 },
    ])
  })

  it('il-seviyesi gözlem, o ilde HİÇ ilçe satırı yoksa satır üretmez (sızıntı yok)', () => {
    const results: DataflowResult[] = [{
      ref: dfRef('medianAge', 'medianAge', 'il'),
      observations: [{ refArea: 'IL_TRABZON', timePeriod: '2024', value: 36.4 }],
    }]
    expect(mergeDemographics(results, resolve)).toEqual([])
  })

  it('çözülemeyen REF_AREA kodu atlanır', () => {
    const results: DataflowResult[] = [{
      ref: dfRef('population', 'population', 'ilce'),
      observations: [
        { refArea: 'ILCE_ORTAHISAR', timePeriod: '2024', value: 320000 },
        { refArea: 'BILINMEYEN', timePeriod: '2024', value: 999 },
      ],
    }]
    expect(mergeDemographics(results, resolve)).toEqual([
      { il: 'TRABZON', ilce: 'ORTAHISAR', population: 320000 },
    ])
  })

  it('il-seviyesi gözlem yalnızca kendi ilinin ilçelerine yayılır', () => {
    const results: DataflowResult[] = [
      {
        ref: dfRef('population', 'population', 'ilce'),
        observations: [
          { refArea: 'ILCE_ORTAHISAR', timePeriod: '2024', value: 320000 },
          { refArea: 'ILCE_ISTANBUL_SISLI', timePeriod: '2024', value: 270000 },
        ],
      },
      {
        ref: dfRef('medianAge', 'medianAge', 'il'),
        observations: [{ refArea: 'IL_TRABZON', timePeriod: '2024', value: 36.4 }],
      },
    ]
    const rows = mergeDemographics(results, resolve)
    expect(rows.find((r) => r.ilce === 'ORTAHISAR')!.medianAge).toBe(36.4)
    expect(rows.find((r) => r.ilce === 'ŞIŞLI')!.medianAge).toBeUndefined()
  })
})
