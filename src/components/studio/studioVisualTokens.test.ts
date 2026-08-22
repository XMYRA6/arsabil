import { STUDIO_SCENE_COLORS, STUDIO_PROGRAM_COLOR_SLOTS, PROGRAM_USE_COLORS } from './studioVisualTokens';

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

describe('STUDIO_SCENE_COLORS', () => {
  it('parsel zemini, kutle ve kat bantlari icin sabit, benzersiz anlamlar tasir', () => {
    const keys = Object.keys(STUDIO_SCENE_COLORS);
    expect(keys).toEqual(
      expect.arrayContaining(['background', 'ground', 'gridMajor', 'gridMinor', 'massFill', 'massEdges', 'massWireframe', 'floorBand']),
    );
    Object.values(STUDIO_SCENE_COLORS).forEach((color) => {
      expect(color).toMatch(HEX_COLOR);
    });
  });

  it('dekoratif cok renk kullanmaz — her deger benzersizdir', () => {
    const values = Object.values(STUDIO_SCENE_COLORS);
    expect(new Set(values).size).toBe(values.length);
  });
});

describe('STUDIO_PROGRAM_COLOR_SLOTS', () => {
  it('Faz 2 program mix icin en az 3 benzersiz renk slotu ayirir', () => {
    expect(STUDIO_PROGRAM_COLOR_SLOTS.length).toBeGreaterThanOrEqual(3);
    STUDIO_PROGRAM_COLOR_SLOTS.forEach((color) => expect(color).toMatch(HEX_COLOR));
    expect(new Set(STUDIO_PROGRAM_COLOR_SLOTS).size).toBe(STUDIO_PROGRAM_COLOR_SLOTS.length);
  });
});

// Faz 2A Task 4: "Zemin ticaret, konut ve ortak alan icin token tabanli
// renk/kenar kurallari tanimla" — STUDIO_PROGRAM_COLOR_SLOTS'un aksine bu
// SABIT bir kullanim->renk eslemesidir (residential HER ZAMAN ayni renk),
// sahne ve legend'in AYNI kaynaktan beslenmesini garantiler.
describe('PROGRAM_USE_COLORS', () => {
  it('dort kullanim turunun her biri icin sabit, benzersiz bir renk tanimlar', () => {
    const uses = ['residential', 'commercial', 'parking', 'common'] as const;
    uses.forEach((use) => expect(PROGRAM_USE_COLORS[use]).toMatch(HEX_COLOR));
    const values = uses.map((use) => PROGRAM_USE_COLORS[use]);
    expect(new Set(values).size).toBe(values.length);
  });
});
