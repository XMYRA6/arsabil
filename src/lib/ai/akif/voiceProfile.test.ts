import {
  AKIF_VOICE_PROFILE,
  shouldConfirmNumericValue,
  validateSharePercentages,
} from "./voiceProfile";

describe("AKIF_VOICE_PROFILE", () => {
  it("keeps the editorial language balance normalized", () => {
    const identity = AKIF_VOICE_PROFILE.identity;
    expect(
      identity.standardTurkish +
        identity.blackSeaRhythm +
        identity.signatureLanguage,
    ).toBeCloseTo(1);
  });

  it("uses valid pause ranges", () => {
    for (const range of Object.values(AKIF_VOICE_PROFILE.pauses)) {
      expect(range.minMs).toBeGreaterThanOrEqual(0);
      expect(range.maxMs).toBeGreaterThan(range.minMs);
    }
  });

  it("confirms low-confidence critical numbers", () => {
    expect(
      shouldConfirmNumericValue({
        confidence: 0.78,
        isOutlier: false,
        isCritical: true,
      }),
    ).toBe(true);
  });

  it("does not interrupt flow for non-critical values", () => {
    expect(
      shouldConfirmNumericValue({
        confidence: 0.4,
        isOutlier: true,
        isCritical: false,
      }),
    ).toBe(false);
  });

  it("accepts only complementary sharing percentages", () => {
    expect(validateSharePercentages(45, 55)).toBe(true);
    expect(validateSharePercentages(45, 50)).toBe(false);
  });
});
