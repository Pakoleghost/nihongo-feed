"use client";

import type { CSSProperties, ReactNode } from "react";

export type StudySelectorOption<T extends string> = {
  key: T;
  label: string;
  tone?: string;
  disabled?: boolean;
  meta?: ReactNode;
};

type StudySelectorGroupProps<T extends string> = {
  label?: string;
  options: Array<StudySelectorOption<T>>;
  value?: T;
  values?: T[];
  multiple?: boolean;
  onSelect?: (value: T) => void;
  onToggle?: (value: T) => void;
  layout?: "grid" | "row";
  minItemWidth?: number;
  compact?: boolean;
};

export const selectorSectionStyle: CSSProperties = {
  display: "grid",
  gap: "var(--space-2)",
  padding: "14px 14px 12px",
  borderRadius: 24,
  background: "color-mix(in srgb, var(--color-surface) 84%, white)",
  border: "1px solid var(--color-border)",
};

function getOptionSelected<T extends string>(option: T, value?: T, values?: T[], multiple?: boolean) {
  if (multiple) return Boolean(values?.includes(option));
  return value === option;
}

export default function StudySelectorGroup<T extends string>({
  label,
  options,
  value,
  values,
  multiple = false,
  onSelect,
  onToggle,
  layout = "grid",
  minItemWidth = 112,
  compact = false,
}: StudySelectorGroupProps<T>) {
  const gridStyle: CSSProperties =
    layout === "row"
      ? {
          display: "flex",
          gap: 8,
          overflowX: "auto",
          paddingBottom: 2,
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }
      : {
          display: "grid",
          gridTemplateColumns: `repeat(auto-fit, minmax(${minItemWidth}px, 1fr))`,
          gap: 8,
        };

  return (
    <div style={selectorSectionStyle}>
      {label ? (
        <div
          style={{
            fontSize: "var(--text-label)",
            color: "var(--color-text-muted)",
            fontWeight: 800,
            letterSpacing: ".08em",
            textTransform: "uppercase",
          }}
        >
          {label}
        </div>
      ) : null}
      <div style={gridStyle}>
        {options.map((option) => {
          const active = getOptionSelected(option.key, value, values, multiple);
          return (
            <button
              key={option.key}
              type="button"
              disabled={option.disabled}
              onClick={() => {
                if (option.disabled) return;
                if (multiple) {
                  onToggle?.(option.key);
                  return;
                }
                onSelect?.(option.key);
              }}
              style={{
                minHeight: compact ? 48 : 56,
                minWidth: layout === "row" ? minItemWidth : undefined,
                borderRadius: compact ? 16 : 18,
                border: active ? "1px solid transparent" : "1px solid var(--color-border)",
                background: active
                  ? option.tone || "color-mix(in srgb, var(--color-highlight-soft) 72%, white)"
                  : "color-mix(in srgb, var(--color-surface) 76%, white)",
                color: active ? "var(--color-text)" : "var(--color-text-muted)",
                fontSize: compact ? 13 : "var(--text-body-sm)",
                fontWeight: 800,
                padding: compact ? "9px 11px" : "10px 12px",
                textAlign: "left",
                display: "grid",
                gap: 3,
                alignContent: "center",
                opacity: option.disabled ? 0.48 : 1,
                cursor: option.disabled ? "not-allowed" : "pointer",
                flex: layout === "row" ? "0 0 auto" : undefined,
                boxShadow: active ? "0 0 0 1px color-mix(in srgb, var(--color-bg) 72%, transparent)" : "none",
              }}
            >
              <span>{option.label}</span>
              {option.meta ? (
                <span style={{ fontSize: 11, fontWeight: 700, color: active ? "var(--color-text-muted)" : "var(--color-text-muted)" }}>
                  {option.meta}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
