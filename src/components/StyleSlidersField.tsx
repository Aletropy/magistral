"use client";

import { Slider } from "@/components/ui/slider";
import {
  STYLE_SLIDERS,
  STYLE_SLIDER_IDS,
  STYLE_SLIDER_MAX,
  STYLE_SLIDER_MIN,
  type StyleSliders,
} from "@/lib/personas/styleSliders";

const SLIDER_STEP = 1;

interface StyleSlidersFieldProps {
  value: StyleSliders;
  disabled: boolean;
  onChange: (sliders: StyleSliders) => void;
}

export function StyleSlidersField({ value, disabled, onChange }: StyleSlidersFieldProps) {
  return (
    <fieldset className="flex flex-col gap-4" disabled={disabled}>
      <legend className="mb-1 text-sm font-medium">Ajustes de estilo</legend>
      {STYLE_SLIDER_IDS.map((id) => {
        const { label, lowLabel, highLabel } = STYLE_SLIDERS[id];
        const labelId = `slider-${id}-label`;
        return (
          <div key={id} className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between">
              <span id={labelId} className="text-sm">
                {label}
              </span>
              <span className="text-sm tabular-nums text-muted-foreground">
                {value[id]}/{STYLE_SLIDER_MAX}
              </span>
            </div>
            <Slider
              aria-labelledby={labelId}
              min={STYLE_SLIDER_MIN}
              max={STYLE_SLIDER_MAX}
              step={SLIDER_STEP}
              disabled={disabled}
              value={[value[id]]}
              onValueChange={([level]) => onChange({ ...value, [id]: level })}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{lowLabel}</span>
              <span>{highLabel}</span>
            </div>
          </div>
        );
      })}
    </fieldset>
  );
}
