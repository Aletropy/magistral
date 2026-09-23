"use client";

import { Slider } from "@/components/ui/slider";
import { TEMPERATURE_MAX, TEMPERATURE_MIN, TEMPERATURE_STEP } from "@/lib/personas/schema";

const TEMPERATURE_DECIMALS = 2;

interface TemperatureFieldProps {
  value: number;
  error?: string;
  disabled: boolean;
  onChange: (temperature: number) => void;
}

export function TemperatureField({ value, error, disabled, onChange }: TemperatureFieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <span id="temperature-label" className="text-sm font-medium">
          Criatividade (temperatura)
        </span>
        <span className="text-sm tabular-nums">{value.toFixed(TEMPERATURE_DECIMALS)}</span>
      </div>
      <Slider
        aria-labelledby="temperature-label"
        min={TEMPERATURE_MIN}
        max={TEMPERATURE_MAX}
        step={TEMPERATURE_STEP}
        disabled={disabled}
        value={[value]}
        onValueChange={([temperature]) => onChange(temperature)}
      />
      <p className="text-xs text-muted-foreground">
        Valores baixos (0,2) para pareceres rigorosos; altos (0,7) para textos persuasivos. O Claude
        (Anthropic) ignora este ajuste.
      </p>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
