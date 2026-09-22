"use client";

/*
 * Kleine Bausteine, die überall wiederkehren. Sie halten das Designsystem
 * zusammen: gleiche Abstände, gleiche Rundungen, gleiche Sprache.
 */

import { Icon, type IconName } from "./Icon";

export function SectionHeading({
  overline,
  title,
  subtitle,
  action,
}: {
  overline?: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
      <div>
        {overline ? <p className="sl-label mb-2">{overline}</p> : null}
        <h2 className="text-2xl sm:text-3xl">{title}</h2>
        {subtitle ? (
          <p className="sl-muted mt-2 max-w-2xl text-sm sm:text-base">{subtitle}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function Slider({
  value,
  min = 0,
  max = 1,
  step = 0.01,
  onChange,
  label,
  displayValue,
  icon,
}: {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
  label?: string;
  displayValue?: string;
  icon?: IconName;
}) {
  const fill = ((value - min) / (max - min)) * 100;
  return (
    <label className="block w-full">
      {label || displayValue ? (
        <span className="flex items-center justify-between mb-1.5 text-xs">
          <span className="sl-muted flex items-center gap-1.5">
            {icon ? <Icon name={icon} size={14} /> : null}
            {label}
          </span>
          {displayValue ? (
            <span className="sl-muted-2 tabular-nums">{displayValue}</span>
          ) : null}
        </span>
      ) : null}
      <input
        type="range"
        className="sl-range"
        style={{ ["--sl-fill" as string]: `${fill}%` }}
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

export function Stepper({
  value,
  onChange,
  min,
  max,
  step = 1,
  unit,
  label,
}: {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  label?: string;
}) {
  return (
    <div className="inline-flex items-center gap-1 sl-inset px-1.5 py-1.5">
      <button
        type="button"
        className="sl-icon-btn"
        style={{ width: "2.1rem", height: "2.1rem" }}
        onClick={() => onChange(Math.max(min, value - step))}
        aria-label={`${label ?? "Wert"} verringern`}
      >
        −
      </button>
      <span className="min-w-[5.5rem] text-center text-sm font-semibold tabular-nums">
        {value}
        {unit ? <span className="sl-muted-2 ml-1 text-xs">{unit}</span> : null}
      </span>
      <button
        type="button"
        className="sl-icon-btn"
        style={{ width: "2.1rem", height: "2.1rem" }}
        onClick={() => onChange(Math.min(max, value + step))}
        aria-label={`${label ?? "Wert"} erhöhen`}
      >
        +
      </button>
    </div>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  size = "md",
}: {
  options: { value: T; label: string; icon?: IconName }[];
  value: T;
  onChange: (value: T) => void;
  size?: "sm" | "md";
}) {
  return (
    <div
      className="inline-flex items-center gap-1 p-1 rounded-full"
      style={{
        backgroundColor: "var(--sl-bg-soft)",
        border: "1px solid var(--sl-line-soft)",
      }}
      role="tablist"
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={`sl-btn ${active ? "sl-btn-primary" : "sl-btn-quiet"} ${
              size === "sm" ? "sl-btn-sm" : "sl-btn-sm sm:px-4"
            }`}
            style={active ? undefined : { border: "1px solid transparent" }}
          >
            {option.icon ? <Icon name={option.icon} size={15} /> : null}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-3 text-sm"
    >
      <span
        className="relative inline-block h-6 w-11 rounded-full transition-colors"
        style={{
          backgroundColor: checked
            ? "color-mix(in srgb, var(--sl-accent) 75%, transparent)"
            : "var(--sl-surface-3)",
        }}
      >
        <span
          className="absolute top-1 h-4 w-4 rounded-full bg-white transition-all"
          style={{ left: checked ? "1.6rem" : "0.25rem" }}
        />
      </span>
      <span>{label}</span>
    </button>
  );
}

export function Meter({
  value,
  label,
  hint,
  tone = "accent",
}: {
  value: number;
  label: string;
  hint?: string;
  tone?: "accent" | "neutral";
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className="sl-inset p-4">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-semibold">{label}</span>
        <span className="text-lg font-bold tabular-nums">{clamped}</span>
      </div>
      <div
        className="mt-2 h-2 rounded-full overflow-hidden"
        style={{ backgroundColor: "var(--sl-surface-3)" }}
      >
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{
            width: `${clamped}%`,
            background:
              tone === "accent"
                ? "linear-gradient(90deg, color-mix(in srgb, var(--sl-accent) 60%, transparent), var(--sl-accent))"
                : "var(--sl-muted)",
          }}
        />
      </div>
      {hint ? <p className="sl-muted text-xs mt-2 leading-relaxed">{hint}</p> : null}
    </div>
  );
}

export function EmptyState({
  emoji,
  title,
  description,
  action,
}: {
  emoji: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="sl-panel p-10 text-center">
      <div className="text-4xl mb-3">{emoji}</div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="sl-muted mt-2 mx-auto max-w-sm text-sm">{description}</p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function Hint({ children }: { children: React.ReactNode }) {
  return (
    <p className="sl-muted text-sm flex items-start gap-2">
      <span
        className="mt-0.5 shrink-0 inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold"
        style={{
          backgroundColor: "color-mix(in srgb, var(--sl-accent) 20%, transparent)",
          color: "var(--sl-accent)",
        }}
      >
        ?
      </span>
      <span>{children}</span>
    </p>
  );
}
