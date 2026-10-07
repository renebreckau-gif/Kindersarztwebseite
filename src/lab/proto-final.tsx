"use client";

// Convergence reference (Phase 02.6): A's functional Growing Mobile as the
// interaction foundation. Object geometry is prototype-only, not final art.

import { useState } from "react";
import s from "./proto-final.module.css";
import { GrowingMobileStage } from "./growing-mobile-stage";
import { AGE_RANGES, PATHS, type PathId } from "./fixtures";
import { ELEMENT_COLORS } from "./mobile-poster";

export function FinalObject({ initial, disable3d }: { initial: PathId | null; disable3d: boolean }) {
  const [selected, setSelected] = useState<PathId | null>(initial);
  const [age, setAge] = useState<number | null>(null);
  const inst = selected === "mein-kind";
  const current = PATHS.find((p) => p.id === selected);

  const select = (id: PathId | null) => {
    setSelected(id);
    setAge(null);
  };

  return (
    <div className={s.objectCol}>
      <GrowingMobileStage
        palette="color"
        selected={selected}
        onSelect={select}
        disable3d={disable3d}
        labels="arms"
        labelsFrom="desktop"
        loadWhenVisible
        age={age}
        onAge={setAge}
        className={s.stage}
      />

      {/* Small screens: the same four paths as thumb-sized controls (C's mobile discipline). */}
      {!inst ? (
        <ul className={s.paths} aria-label="Bereiche">
          {PATHS.map((p) => (
            <li key={p.id}>
              <a
                href={`?pfad=${p.id}`}
                aria-current={selected === p.id ? "true" : undefined}
                onClick={(e) => {
                  e.preventDefault();
                  select(selected === p.id ? null : p.id);
                }}
              >
                <span className={s.key} style={{ ["--c" as string]: ELEMENT_COLORS.color[p.id] }} aria-hidden="true" />
                {p.label}
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <div className={s.inst}>
          <fieldset className={s.ages}>
            <legend>Alter wählen</legend>
            {AGE_RANGES.map((r, i) => (
              <label key={r}>
                <input type="radio" name="alter-final" checked={age === i} onChange={() => setAge(i)} />
                <span>{r}</span>
              </label>
            ))}
          </fieldset>
          <button type="button" className={s.back} onClick={() => select(null)}>
            Zurück zur Übersicht
          </button>
        </div>
      )}

      <p className={s.preview} aria-live="polite">
        {inst
          ? age !== null
            ? `${AGE_RANGES[age]} Jahre gewählt. Inhalte folgen in einer späteren Phase.`
            : "Mein Kind: Das Objekt wird zum Messinstrument."
          : current
            ? `${current.label}: ${current.preview}`
            : ""}
      </p>
    </div>
  );
}
