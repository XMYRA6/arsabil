import { buildResumeContext, type ResumeTranscriptItem } from '../voiceResume'

it('boş transkript → sarmalayıcı + "henüz konuşma yok"', () => {
  const out = buildResumeContext([])
  expect(out).toContain('Bağlantı koptu ve yeniden kuruldu')
  expect(out).toContain('henüz konuşma yok')
  expect(out).toContain('Kaldığın yerden devam et')
})

it('turları rol etiketiyle render eder, boş metinli/kart-only satırları atlar', () => {
  const t: ResumeTranscriptItem[] = [
    { role: 'user', text: '1200 metrekare arsam var' },
    { role: 'akif', text: 'Anladım, emsal kaç?' },
    { role: 'akif', text: '', card: { kind: 'term', term: 'emsal', shortDef: 'x', example: 'y' } },
  ]
  const out = buildResumeContext(t)
  expect(out).toContain('Kullanıcı: 1200 metrekare arsam var')
  expect(out).toContain('Akif: Anladım, emsal kaç?')
  expect(out).toContain('("emsal" terimi açıklandı)')
})

it('son 8 turla sınırlar', () => {
  const t: ResumeTranscriptItem[] = Array.from({ length: 12 }, (_, i) => ({
    role: 'user' as const,
    text: `mesaj ${i}`,
  }))
  const out = buildResumeContext(t)
  expect(out).not.toContain('mesaj 3')
  expect(out).toContain('mesaj 4')
  expect(out).toContain('mesaj 11')
})

it('ScenarioCard tek satıra düzleşir, null alanlar "?"', () => {
  const t: ResumeTranscriptItem[] = [
    {
      role: 'akif',
      text: '',
      card: {
        kind: 'contractor_offers',
        rows: [
          {
            label: 'Müteahhit %50',
            arsaPayiX: 0.45,
            arsaSahibiDaireSayisi: null,
            arsaSahibiDegeriTL: null,
            daireSatisFiyatiTL: 3_000_000,
          },
        ],
        defaultsUsed: [],
        assumptions: [],
        emsalNote: '',
      },
    },
  ]
  const out = buildResumeContext(t)
  expect(out).toContain('Son hesap: contractor_offers')
  expect(out).toContain('"Müteahhit %50"')
  expect(out).toContain('%45')
  expect(out).toContain('? daire')
})

it('birden çok kart → sadece sonuncusu', () => {
  const t: ResumeTranscriptItem[] = [
    { role: 'akif', text: '', card: { kind: 'term', term: 'kaks', shortDef: 'x', example: 'y' } },
    { role: 'akif', text: '', card: { kind: 'term', term: 'emsal', shortDef: 'x', example: 'y' } },
  ]
  const out = buildResumeContext(t)
  expect(out).toContain('"emsal" terimi açıklandı')
  expect(out).not.toContain('"kaks" terimi açıklandı')
})
