import { VOICE_RHYTHM_PROMPT } from "../voiceRhythm";

describe("VOICE_RHYTHM_PROMPT", () => {
  it("Karadeniz ritmi yönlendirmesi içerir", () => {
    expect(VOICE_RHYTHM_PROMPT).toMatch(/Karadeniz/i);
  });

  it("fonetik taklit YASAĞINI açıkça söyler", () => {
    expect(VOICE_RHYTHM_PROMPT).toMatch(/taklit|karikatür|fonetik/i);
  });

  it("sayıları net telaffuz kuralını içerir", () => {
    expect(VOICE_RHYTHM_PROMPT).toMatch(/say[ıi]|rakam/i);
  });

  it("boş değil, makul uzunlukta", () => {
    expect(VOICE_RHYTHM_PROMPT.length).toBeGreaterThan(120);
    expect(VOICE_RHYTHM_PROMPT.length).toBeLessThan(1500);
  });
});
