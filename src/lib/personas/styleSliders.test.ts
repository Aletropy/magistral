import { describe, expect, it } from "vitest";
import { DEFAULT_STYLE_SLIDERS, STYLE_SLIDERS, styleSliderInstructions } from "./styleSliders";

describe("styleSliderInstructions", () => {
  it("adds nothing when every slider is neutral", () => {
    expect(styleSliderInstructions(DEFAULT_STYLE_SLIDERS)).toEqual([]);
  });

  it("adds one instruction per slider moved away from neutral, in slider order", () => {
    expect(styleSliderInstructions({ formality: 5, aggressiveness: 3, length: 1 })).toEqual([
      STYLE_SLIDERS.formality.instructions[5],
      STYLE_SLIDERS.length.instructions[1],
    ]);
  });
});
