"use client";

// Signature entry — object zone + four paths (Phase 06).
// The object hangs in the sunlit arch: designed SVG poster first, WebGL on top
// when allowed, a soft cast shadow on the wall; window, floor, bowl and the
// seated child come from room-scene.tsx.
// The four paths are real links (?pfad=…) that work without JavaScript; with
// JavaScript they tip the mobile toward the chosen element instead of reloading.

import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import s from "./signature.module.css";
import { SignaturePoster } from "./signature-poster";
import { PathIcon } from "./path-icons";
import { RoomBackdrop, SeatedChild } from "./room-scene";
import { SAGE_STOP_Y, SROD, SVIEW, sigTarget, sPct } from "./signature-geometry";
import { AGE_RANGES, PATHS, type PathId } from "../fixtures";
import { useEnhancement } from "../use-enhancement";

const SignatureScene = dynamic(() => import("./signature-scene"), { ssr: false });

/** Short orientation lines for the path row. Navigation copy, not practice facts. */
const PATH_TEXT: Record<PathId, string> = {
  heute: "Sprechzeiten, Telefon und Anfahrt",
  "mein-kind": "Vorsorge und Orientierung nach Alter",
  praxis: "Ärztinnen, Team und erster Besuch",
  entdecken: "Für Kinder: So läuft ein Arztbesuch",
};

export function SignatureEntry({ initial, disable3d }: { initial: PathId | null; disable3d: boolean }) {
  const [selected, setSelected] = useState<PathId | null>(initial);
  const [age, setAge] = useState<number | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const reason = useEnhancement(disable3d, root);
  const [ready, setReady] = useState(false);
  const pose = sigTarget(selected);
  const inst = selected === "mein-kind";
  const current = PATHS.find((p) => p.id === selected);

  const select = (id: PathId | null) => {
    setSelected(id);
    setAge(null);
  };

  return (
    <>
      <div className={s.objectZone} data-selected={selected ?? ""} data-inst={inst ? "" : undefined}>
        <div className={s.scene}>
          <RoomBackdrop className={s.backdrop} />
          <div ref={root} className={s.stage} style={{ aspectRatio: `${SVIEW.w} / ${SVIEW.h}` }} data-enhancement={reason ?? "pending"}>
            <SignaturePoster pose={pose} selected={selected} shadow className={s.castShadow} />
            <SignaturePoster pose={pose} selected={selected} className={`${s.layer} ${ready ? s.hidden : ""}`} />
            {reason === "ok" ? (
              <div className={`${s.layer} ${ready ? s.visible : s.hidden}`}>
                <SignatureScene selected={selected} onSelect={(id) => select(selected === id ? null : id)} onReady={() => setReady(true)} />
              </div>
            ) : null}
            {inst ? (
              <ol className={s.rodLabels} aria-hidden="true">
                {AGE_RANGES.map((r, i) => (
                  <li key={r} style={sPct([SROD.x - 0.2, SAGE_STOP_Y[i]])} data-active={age === i ? "" : undefined}>
                    {r}
                  </li>
                ))}
              </ol>
            ) : null}
          </div>
          <SeatedChild className={s.child} />
        </div>
      </div>

      <div className={s.pathsArea} id="pfade">
        <nav aria-label="Bereiche">
          <ul className={s.paths}>
            {PATHS.map((p) => (
              <li key={p.id}>
                <a
                  href={`?pfad=${p.id}#pfade`}
                  className={s.path}
                  aria-current={selected === p.id ? "true" : undefined}
                  onClick={(ev) => {
                    ev.preventDefault();
                    select(selected === p.id ? null : p.id);
                  }}
                >
                  <span className={s.pathIcon}>
                    <PathIcon id={p.id} />
                  </span>
                  <span className={s.pathTitle}>{p.label}</span>
                  <span className={s.pathText}>{PATH_TEXT[p.id]}</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {inst ? (
          <div className={s.ageRail}>
            <fieldset>
              <legend>Alter Ihres Kindes</legend>
              <div className={s.ageOptions}>
                {AGE_RANGES.map((r, i) => (
                  <label key={r}>
                    <input type="radio" name="alter" checked={age === i} onChange={() => setAge(i)} />
                    <span>{r} Jahre</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <button type="button" className={s.back} onClick={() => select(null)}>
              Zurück zur Übersicht
            </button>
          </div>
        ) : null}

        <p className={s.preview} aria-live="polite">
          {inst
            ? age !== null
              ? `${AGE_RANGES[age]} Jahre gewählt. Inhalte folgen in einer späteren Phase.`
              : "Mein Kind: Das Mobile wird zum Messstab. Wählen Sie ein Alter."
            : current
              ? `${current.label}: Inhalte folgen in einer späteren Phase.`
              : ""}
        </p>
      </div>
    </>
  );
}
