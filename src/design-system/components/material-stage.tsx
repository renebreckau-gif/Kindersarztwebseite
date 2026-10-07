"use client";

// 3D material direction on the existing (placeholder) Growing Mobile geometry.
// Geometry is NOT final (Phase 06); only materials, light and fallback are shown.

import { useState } from "react";
import { GrowingMobileStage } from "@/lab/growing-mobile-stage";
import type { PathId } from "@/lab/fixtures";

export function MaterialStage({ disable3d = false }: { disable3d?: boolean }) {
  const [selected, setSelected] = useState<PathId | null>(null);
  const [age, setAge] = useState<number | null>(null);
  return (
    <GrowingMobileStage
      palette="material"
      selected={selected}
      onSelect={setSelected}
      disable3d={disable3d}
      labels="none"
      loadWhenVisible
      age={age}
      onAge={setAge}
    />
  );
}
