import { VOICE_RHYTHM_PROMPT } from "../voiceRhythm";

describe("VOICE_RHYTHM_PROMPT", () => {
  it("Karadeniz ritmi yönlendirmesi içerir", () => {
    expect(VOICE_RHYTHM_PROMPT).toMatch(/Karadeniz/i);
  });

  it("fonetik taklit YASAĞINI açıkça söyler", () => {
    // Polarity-sensitive: "asla/yapma/yok" must be near the ban words
    // Fails if negation is removed or inverted to "hafif fonetik...olabilir"
    expect(VOICE_RHYTHM_PROMPT).toMatch(/asla[^.]*(?:fonetik|taklit|karikatür)/i);
  });

  it("sayıları net telaffuz kuralını içerir", () => {
    expect(VOICE_RHYTHM_PROMPT).toMatch(/say[ıi]|rakam/i);
  });

  it("kafadan aritmetik yasağını polarite duyarlı biçimde söyler", () => {
    // "asla" ban kelimesine yakın olmalı — negatif kaldırılır/tersine çevrilirse düşer
    expect(VOICE_RHYTHM_PROMPT).toMatch(/asla[^.]*(?:aritmetik|kafadan|hesap)/i);
    // sayılar araç sonucundan gelmeli
    expect(VOICE_RHYTHM_PROMPT).toMatch(/ara[çc][^.]*sonu[çc]/i);
    // araç sonucu yoksa hesabı yapamadığını söyle
    expect(VOICE_RHYTHM_PROMPT).toMatch(/yapamad[ıi][ğg][ıi]n[ıi]/i);
  });

  it("boş değil, makul uzunlukta", () => {
    expect(VOICE_RHYTHM_PROMPT.length).toBeGreaterThan(120);
    expect(VOICE_RHYTHM_PROMPT.length).toBeLessThan(1500);
  });
});
