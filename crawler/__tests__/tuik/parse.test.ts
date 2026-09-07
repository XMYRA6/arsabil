import { parseSdmxCsv, type SdmxObservation } from '../../tuik/parse'

describe('parseSdmxCsv', () => {
  it('REF_AREA / TIME_PERIOD / OBS_VALUE sütunlarını çıkarır', () => {
    const csv = [
      'DATAFLOW,REF_AREA,TIME_PERIOD,OBS_VALUE,UNIT_MULT',
      'TR:DF_ADNKS_T22(1.1),TR_ILCE_3401,2024,17550,0',
      'TR:DF_ADNKS_T22(1.1),TR_ILCE_3402,2024,742102,0',
    ].join('\n')
    expect(parseSdmxCsv(csv)).toEqual<SdmxObservation[]>([
      { refArea: 'TR_ILCE_3401', timePeriod: '2024', value: 17550 },
      { refArea: 'TR_ILCE_3402', timePeriod: '2024', value: 742102 },
    ])
  })

  it('ondalık OBS_VALUE parse eder (medyan yaş / hane)', () => {
    const csv = ['REF_AREA,TIME_PERIOD,OBS_VALUE', 'TR_IL_61,2024,"36.4"'].join('\n')
    expect(parseSdmxCsv(csv)).toEqual([{ refArea: 'TR_IL_61', timePeriod: '2024', value: 36.4 }])
  })

  it('ondalık virgüllü OBS_VALUE parse eder', () => {
    const csv = ['REF_AREA,TIME_PERIOD,OBS_VALUE', 'TR_IL_61,2024,"36,4"'].join('\n')
    expect(parseSdmxCsv(csv)).toEqual([{ refArea: 'TR_IL_61', timePeriod: '2024', value: 36.4 }])
  })

  it('boş / sayısal olmayan OBS_VALUE satırını atlar', () => {
    const csv = [
      'REF_AREA,TIME_PERIOD,OBS_VALUE',
      'TR_ILCE_3401,2024,',
      'TR_ILCE_3402,2024,NaN',
      'TR_ILCE_3403,2024,123',
    ].join('\n')
    expect(parseSdmxCsv(csv)).toEqual([{ refArea: 'TR_ILCE_3403', timePeriod: '2024', value: 123 }])
  })

  it('sütun sırası farklıysa başlığa göre çözer', () => {
    const csv = ['OBS_VALUE,TIME_PERIOD,REF_AREA', '999,2024,TR_ILCE_0101'].join('\n')
    expect(parseSdmxCsv(csv)).toEqual([{ refArea: 'TR_ILCE_0101', timePeriod: '2024', value: 999 }])
  })

  it('boş gövde → boş dizi', () => {
    expect(parseSdmxCsv('REF_AREA,TIME_PERIOD,OBS_VALUE\n')).toEqual([])
  })

  it('REF_AREA / TIME_PERIOD / OBS_VALUE eksik başlık atarsa throw', () => {
    expect(() => parseSdmxCsv('REF_AREA,TIME_PERIOD\nTR_IL_61,2024')).toThrow(
      /REF_AREA|OBS_VALUE|eksik/i,
    )
  })

  it('boş REF_AREA satırını atlar', () => {
    const csv = ['REF_AREA,TIME_PERIOD,OBS_VALUE', ',2024,500', 'TR_ILCE_3401,2024,600'].join('\n')
    expect(parseSdmxCsv(csv)).toEqual([{ refArea: 'TR_ILCE_3401', timePeriod: '2024', value: 600 }])
  })
})
