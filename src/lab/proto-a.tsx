"use client";

import { useState } from "react";
import s from "./proto-a.module.css";
import { GrowingMobileStage } from "./growing-mobile-stage";
import { AGE_RANGES, PATHS, type PathId } from "./fixtures";
import { ELEMENT_COLORS } from "./mobile-poster";

const SWATCH: Record<PathId, string> = {
  heute: s.swDisc,
  "mein-kind": s.swSphere,
  praxis: s.swCapsule,
  entdecken: s.swRing,
};

export function ProtoAStage({ initial, disable3d }: { initial: PathId | null; disable3d: boolean }) {
  const [selected, setSelected] = useState<PathId | null>(initial);
  const [age, setAge] = useState<number | null>(null);
  const current = PATHS.find((p) => p.id === selected);
  const inst = selected === "mein-kind";

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
        age={age}
        onAge={setAge}
        className={s.stage}
      />

      {/* Mobile controls: same four paths, thumb-sized, colour-keyed to the object. */}
      {!inst ? (
        <ul className={s.pathGrid} aria-label="Bereiche">
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
                <span className={`${s.swatch} ${SWATCH[p.id]}`} style={{ ["--c" as string]: ELEMENT_COLORS.color[p.id] }} aria-hidden="true" />
                {p.label}
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <div className={s.mobileInst}>
          <fieldset className={s.ageRow}>
            <legend>Alter wählen</legend>
            {AGE_RANGES.map((r, i) => (
              <label key={r}>
                <input type="radio" name="alter-mobil" checked={age === i} onChange={() => setAge(i)} />
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
            ? `${AGE_RANGES[age]} Jahre gewählt. Inhalte für dieses Alter folgen in einer späteren Phase.`
            : "Mein Kind: Das Objekt wird zum Messinstrument. Wählen Sie ein Alter."
          : current
            ? `${current.label}: ${current.preview}`
            : ""}
      </p>
    </div>
  );
}
