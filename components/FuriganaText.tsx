"use client";

import type { CSSProperties } from "react";

// Parses "{漢字|ふりがな}" notation into typed segments.
type Segment = { text: string; reading?: string };

function parse(input: string): Segment[] {
  const segs: Segment[] = [];
  const re = /\{([^|]+)\|([^}]+)\}/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(input)) !== null) {
    if (m.index > last) segs.push({ text: input.slice(last, m.index) });
    segs.push({ text: m[1], reading: m[2] });
    last = re.lastIndex;
  }
  if (last < input.length) segs.push({ text: input.slice(last) });
  return segs;
}

type Props = {
  text: string;
  style?: CSSProperties;
  /** Overrides for the <rt> furigana element */
  rtColor?: string;
};

export default function FuriganaText({ text, style, rtColor }: Props) {
  const segs = parse(text);
  return (
    <span style={style}>
      {segs.map((s, i) =>
        s.reading ? (
          <ruby key={i}>
            {s.text}
            <rt
              style={{
                fontSize: "0.5em",
                lineHeight: 1,
                color: rtColor ?? "inherit",
                opacity: rtColor ? 1 : 0.65,
                letterSpacing: 0,
                textAlign: "center",
              }}
            >
              {s.reading}
            </rt>
          </ruby>
        ) : (
          <span key={i}>{s.text}</span>
        )
      )}
    </span>
  );
}
