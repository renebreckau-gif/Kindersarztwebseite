"use client";

// The Growing Mobile stage: designed SVG poster first, WebGL layer on top when
// allowed, and real DOM controls positioned from the same geometry.

import dynamic from "next/dynamic";
import { useState } from "react";
import s from "./growing-mobile-stage.module.css";
import { MobilePoster, type Palette } from "./mobile-poster";
import { AGE_STOP_Y, ROD, layout, targetPose, toPct, VIEW } from "./mobile-geometry";
import { AGE_RANGES, PATHS, type PathId } from "./fixtures";
import { useEnhancement } from "./use-enhancement";

const MobileScene = dynamic(() => import("./mobile-scene"), { ssr: false });

export interface StageProps {
  palette: Palette;
  selected: PathId | null;
  highlight?: PathId | null;
  onSelect: (id: PathId | null) => void;
  disable3d: boolean;
  /** "arms": DOM labels hang under the elements (desktop of A). */
  labels: "arms" | "none";
  age: number | null;
  onAge: (i: number) => void;
  className?: string;
  /** Render label set only above this width (mobile uses its own controls). */
  labelsFrom?: "always" | "desktop";
}

export function GrowingMobileStage(p: StageProps) {
  const reason = useEnhancement(p.disable3d);
  const [ready, setReady] = useState(false);
  const pose = targetPose(p.selected);
  const L = layout(pose);
  const inst = p.selected === "mein-kind";

  return (
    <div
      className={`${s.stage} ${p.className ?? ""}`}
      style={{ aspectRatio: `${VIEW.w} / ${VIEW.h}` }}
      data-enhancement={reason ?? "pending"}
    >
      <MobilePoster pose={pose} palette={p.palette} highlight={p.highlight ?? null} className={`${s.layer} ${ready ? s.hidden : ""}`} />
      {reason === "ok" ? (
        <div className={`${s.layer} ${ready ? s.visible : s.hidden}`}>
          <MobileScene
            selected={p.selected}
            highlight={p.highlight ?? null}
            palette={p.palette}
            onSelect={(id) => p.onSelect(id)}
            onReady={() => setReady(true)}
          />
        </div>
      ) : null}

      {p.labels === "arms" && !inst ? (
        <ul className={`${s.labels} ${p.labelsFrom === "desktop" ? s.desktopOnly : ""}`} aria-label="Bereiche">
          {PATHS.map((path) => {
            const e = L.elements.find((x) => x.id === path.id)!;
            const pos = toPct([e.pos[0], e.pos[1] - e.size - 0.1]);
            return (
              <li key={path.id} className={s.label} style={pos}>
                <a
                  href={`?pfad=${path.id}`}
                  aria-current={p.selected === path.id ? "true" : undefined}
                  onClick={(ev) => {
                    ev.preventDefault();
                    p.onSelect(p.selected === path.id ? null : path.id);
                  }}
                >
                  {path.label}
                </a>
              </li>
            );
          })}
        </ul>
      ) : null}

      {inst ? (
        <div className={`${s.instrument} ${p.labelsFrom === "desktop" ? s.desktopOnly : ""}`}>
          <div className={s.instHead} style={toPct([ROD.x - 0.1, ROD.y1 + 0.12])}>
            <span className={s.instTitle}>Mein Kind</span>
            <button type="button" className={s.back} onClick={() => p.onSelect(null)}>
              Zurück zur Übersicht
            </button>
          </div>
          <fieldset className={s.ages}>
            <legend className="visually-hidden">Alter wählen</legend>
            {AGE_RANGES.map((range, i) => (
              <label key={range} className={s.age} style={toPct([ROD.x - 0.24, AGE_STOP_Y[i]])}>
                <input type="radio" name="alter" checked={p.age === i} onChange={() => p.onAge(i)} />
                <span>{range} Jahre</span>
              </label>
            ))}
          </fieldset>
        </div>
      ) : null}
    </div>
  );
}
