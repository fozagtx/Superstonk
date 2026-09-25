"use client";

import NumberFlow from "@number-flow/react";

export function AnimPct({ value }: { value: number }) {
  return (
    <NumberFlow
      value={value / 100}
      format={{
        style: "percent",
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
        signDisplay: "always",
      }}
      className="num"
    />
  );
}
