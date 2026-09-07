import { readFileSync } from 'fs'
import { join } from 'path'
import { parseSdmxCsv, type SdmxObservation } from '../../tuik/parse'

const fixture = (name: string) =>
  readFileSync(join(__dirname, '../../tuik/fixtures', name), 'utf8')

describe('parseSdmxCsv', () => {
  it('coğrafi kodu IKAMET_YERI sütunundan alır (REF_AREA değil)', () => {
    const csv = [
      'DATAFLOW,REF_AREA,IKAMET_YERI,TIME_PERIOD,OBS_VALUE',
      'TR:DF_ADNKS_T22(1.1),TR,1421,2025,458573',
      'TR:DF_ADNKS_T22(1.1),TR,1663,2025,261959',
    ].join('\n')
    expect(parseSdmxCsv(csv)).toEqual<SdmxObservation[]>([
      { refArea: '1421', timePeriod: '2025', value: 458573 },
      { refArea: '1663', timePeriod: '2025', value: 261959 },
    ])
  })

  it('filter: eşleşmeyen kırılım satırlarını atar', () => {
    const csv = [
      'IKAMET_YERI,YERLESIM_YERI_TUR,TIME_PERIOD,OBS_VALUE',
      '1421,_T,2025,458573',
      '1421,1,2025,458573', // kentsel kırılım — atılmalı
      '1663,2,2025,999', // kırsal kırılım — atılmalı
    ].join('\n')
    expect(parseSdmxCsv(csv, { filter: { YERLESIM_YERI_TUR: '_T' } })).toEqual([
      { refArea: '1421', timePeriod: '2025', value: 458573 },
    ])
  })

  it('filter: birden fazla anahtar — hepsi eşleşmeli', () => {
    const csv = [
      'IKAMET_YERI,ADNKS_GOSTERGE,SEX,TIME_PERIOD,OBS_VALUE',
      'TR100,ORTANCA_YAS,_T,2025,34.96',
      'TR100,ORTANCA_YAS,1,2025,34.28', // yanlış SEX
      'TR100,NUFUS,_T,2025,999', // yanlış gösterge
    ].join('\n')
    expect(parseSdmxCsv(csv, { filter: { ADNKS_GOSTERGE: 'ORTANCA_YAS', SEX: '_T' } })).toEqual([
      { refArea: 'TR100', timePeriod: '2025', value: 34.96 },
    ])
  })

  it('filter sütunu başlıkta yoksa throw (yanlış dataflow koruması)', () => {
    const csv = 'IKAMET_YERI,TIME_PERIOD,OBS_VALUE\n1421,2025,1'
    expect(() => parseSdmxCsv(csv, { filter: { SEX: '_T' } })).toThrow(/SEX/)
  })

  it('ondalık nokta ve virgül — ikisini de parse eder', () => {
    const csv = [
      'IKAMET_YERI,TIME_PERIOD,OBS_VALUE',
      'TR100,2025,"34.96"',
      'TR212,2025,"41,83"',
    ].join('\n')
    expect(parseSdmxCsv(csv)).toEqual([
      { refArea: 'TR100', timePeriod: '2025', value: 34.96 },
      { refArea: 'TR212', timePeriod: '2025', value: 41.83 },
    ])
  })

  it('negatif OBS_VALUE (nüfus artış hızı ‰)', () => {
    const csv = 'IKAMET_YERI,TIME_PERIOD,OBS_VALUE\n1421,2025,-7.85440448180391'
    expect(parseSdmxCsv(csv)).toEqual([
      { refArea: '1421', timePeriod: '2025', value: -7.85440448180391 },
    ])
  })

  it('boş / sayısal olmayan OBS_VALUE satırını atlar', () => {
    const csv = [
      'IKAMET_YERI,TIME_PERIOD,OBS_VALUE',
      '1401,2025,',
      '1402,2025,NaN',
      '1403,2025,123',
    ].join('\n')
    expect(parseSdmxCsv(csv)).toEqual([{ refArea: '1403', timePeriod: '2025', value: 123 }])
  })

  it('boş IKAMET_YERI satırını atlar', () => {
    const csv = ['IKAMET_YERI,TIME_PERIOD,OBS_VALUE', ',2025,500', '1401,2025,600'].join('\n')
    expect(parseSdmxCsv(csv)).toEqual([{ refArea: '1401', timePeriod: '2025', value: 600 }])
  })

  it('sütun sırası farklıysa başlığa göre çözer', () => {
    const csv = ['OBS_VALUE,TIME_PERIOD,IKAMET_YERI', '999,2025,0101'].join('\n')
    expect(parseSdmxCsv(csv)).toEqual([{ refArea: '0101', timePeriod: '2025', value: 999 }])
  })

  it('IKAMET_YERI / TIME_PERIOD / OBS_VALUE başlık eksikse throw', () => {
    expect(() => parseSdmxCsv('REF_AREA,TIME_PERIOD\nTR,2025')).toThrow(
      /IKAMET_YERI|OBS_VALUE|eksik/i,
    )
  })

  it('boş gövde → boş dizi', () => {
    expect(parseSdmxCsv('IKAMET_YERI,TIME_PERIOD,OBS_VALUE\n')).toEqual([])
  })

  it('gerçek fixture (T22 nüfus) — rowFilter ile ilçe + il + ulusal, kırılım elenmiş', () => {
    const obs = parseSdmxCsv(fixture('adnks-t22-nufus-2025.csv'), {
      filter: { ADNKS_GOSTERGE: 'NUFUS', YERLESIM_YERI_TUR: '_T' },
    })
    expect(obs.map((o) => o.refArea).sort()).toEqual(['1421', '1663', 'TR100', '_T'])
    expect(obs.find((o) => o.refArea === '1421')!.value).toBe(458573)
    expect(obs.find((o) => o.refArea === 'TR100')!.value).toBe(15754053)
  })

  it('gerçek fixture (T23 ortanca yaş) — SEX=_T filtresi cinsiyet kırılımını eler', () => {
    const obs = parseSdmxCsv(fixture('adnks-t23-ortancayas-2025.csv'), {
      filter: { ADNKS_GOSTERGE: 'ORTANCA_YAS', SEX: '_T' },
    })
    expect(obs.map((o) => o.refArea).sort()).toEqual(['TR', 'TR100', 'TR212', 'TR901'])
    expect(obs.find((o) => o.refArea === 'TR100')!.value).toBeCloseTo(34.9554952391427)
  })
})
