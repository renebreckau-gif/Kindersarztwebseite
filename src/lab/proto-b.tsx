"use client";

import { useState } from "react";
import s from "./proto-b.module.css";
import { GrowingMobileStage } from "./growing-mobile-stage";
import { AGE_RANGES, PATHS, type PathId } from "./fixtures";

export function ProtoBInstrument({ initial, disable3d }: { initial: PathId | null; disable3d: boolean }) {
  const [selected, setSelected] = useState<PathId | null>(initial);
  const [hover, setHover] = useState<PathId | null>(null);
  const [age, setAge] = useState<number | null>(null);
  const inst = selected === "mein-kind";

  const select = (id: PathId | null) => {
    setSelected(id);
    setAge(null);
  };

  return (
    <div className={s.instrument}>
      <GrowingMobileStage
        palette="ink"
        selected={selected}
        highlight={hover ?? selected}
        onSelect={select}
        disable3d={disable3d}
        labels="none"
        age={age}
        onAge={setAge}
        className={s.stage}
      />
      <nav aria-label="Bereiche" className={s.indexNav}>
        <ol className={s.index}>
          {PATHS.map((p) => (
            <li key={p.id}>
              <a
                href={`?pfad=${p.id}`}
                aria-current={selected === p.id ? "true" : undefined}
                onPointerEnter={() => setHover(p.id)}
                onPointerLeave={() => setHover(null)}
                onFocus={() => setHover(p.id)}
                onBlur={() => setHover(null)}
                onClick={(e) => {
                  e.preventDefault();
                  select(selected === p.id ? null : p.id);
                }}
              >
                <span className={s.indexLabel}>{p.label}</span>
                <span className={s.indexPreview}>{p.preview}</span>
              </a>
            </li>
          ))}
        </ol>
      </nav>
      <p className={s.live} aria-live="polite">
        {inst ? (age !== null ? `${AGE_RANGES[age]} Jahre gewählt. Inhalte folgen in einer späteren Phase.` : "Mein Kind: Alter am Instrument wählen.") : ""}
      </p>
    </div>
  );
}
