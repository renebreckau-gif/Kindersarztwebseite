"use client";

// Mein Arztbesuch — story player (Phase 08).
// Without JavaScript every scene is rendered as an ordered list (complete story, readable
// aloud, works with screen readers). With JavaScript it becomes one scene at a time:
// Weiter / Zurück buttons, focus moves to the scene title, a polite live region announces
// "Szene 3 von 6". No timers, no gestures, no scroll-jacking, no scores. Progress lives
// only in component state — nothing is stored.

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import s from "./story.module.css";
import { ScenePlaceholder } from "./placeholders";
import type { Scene } from "@/content/discovery";

const two = (n: number) => String(n).padStart(2, "0");

const ok = (v?: { status: string }) => v?.status === "VERIFIED_CURRENT";

/** Preview-only review line: what is still open for this scene (from the content model). */
function reviewState(scene: Scene): string {
  const open = [
    !ok(scene.contentApproval) && "Inhalt",
    !ok(scene.practiceApproval) && "Praxis",
    scene.medicalApproval && !ok(scene.medicalApproval) && "ärztliche Prüfung",
  ].filter(Boolean);
  const img = scene.visual.class === "PLACEHOLDER" ? `Bild: Platzhalter (${scene.visual.briefId})` : "Bild: final";
  return `${open.length ? `offen: ${open.join(", ")}` : "freigegeben"} · ${img}`;
}

/** The approved scene image (4:3 frame, same box as the placeholder). Informative: has alt. */
function SceneImage({ scene, eager }: { scene: Scene; eager: boolean }) {
  const img = scene.visual.image!;
  const set = (ext: string) => img.widths.map((w) => `/discovery/d1-${img.slug}-${w}.${ext} ${w}w`).join(", ");
  const sizes = "(min-width: 64em) 56vw, calc(100vw - 2.5rem)";
  return (
    <figure className={s.frame}>
      <picture>
        <source type="image/avif" srcSet={set("avif")} sizes={sizes} />
        <img
          className={s.image}
          src={`/discovery/d1-${img.slug}-960.webp`}
          srcSet={set("webp")}
          sizes={sizes}
          width={img.width}
          height={img.height}
          alt={scene.visual.alt}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
        />
      </picture>
    </figure>
  );
}

export function Story({ scenes, preview }: { scenes: Scene[]; preview: boolean }) {
  const [enhanced, setEnhanced] = useState(false);
  const [index, setIndex] = useState(0);
  const [announce, setAnnounce] = useState("");
  const headings = useRef<(HTMLHeadingElement | null)[]>([]);
  const moved = useRef(false);
  const total = scenes.length;

  useEffect(() => setEnhanced(true), []);

  useEffect(() => {
    if (!enhanced || !moved.current) return;
    headings.current[index]?.focus({ preventScroll: true });
    headings.current[index]?.closest("section")?.scrollIntoView({ block: "start", behavior: "instant" as ScrollBehavior });
    setAnnounce(`Szene ${index + 1} von ${total}: ${scenes[index].title}`);
  }, [index, enhanced, scenes, total]);

  const overview = preview ? "/entdecken?vorschau=freigabe" : "/entdecken";

  const go = (next: number) => {
    moved.current = true;
    setIndex(Math.max(0, Math.min(total - 1, next)));
  };

  return (
    <div className={s.story} data-enhanced={enhanced ? "" : undefined}>
      <ol className={s.scenes}>
        {scenes.map((scene, i) => (
          <li key={scene.id} hidden={enhanced && i !== index} className={s.sceneItem}>
            <section className={s.scene} aria-labelledby={`szene-${scene.id}`}>
              <div className={s.visual}>
                {scene.visual.image && scene.visual.class !== "PLACEHOLDER" ? (
                  <SceneImage scene={scene} eager={i === 0} />
                ) : (
                  <ScenePlaceholder motif={scene.visual.motif} />
                )}
              </div>

              <div className={s.text}>
                <p className={s.progress}>
                  <span className={s.count}>
                    {two(scene.order)} / {two(total)}
                  </span>
                  <span className={s.dots} aria-hidden="true">
                    {scenes.map((x) => (
                      <span key={x.id} data-on={x.order <= scene.order ? "" : undefined} />
                    ))}
                  </span>
                </p>
                <h2 id={`szene-${scene.id}`} ref={(el) => void (headings.current[i] = el)} tabIndex={-1} className={s.title}>
                  {scene.title}
                </h2>
                <div className={s.childCopy}>
                  {scene.childCopy.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </div>

                {enhanced ? (
                  <div className={s.nav}>
                    {i > 0 ? (
                      <button type="button" className={s.back} onClick={() => go(i - 1)}>
                        Zurück
                      </button>
                    ) : null}
                    {i < total - 1 ? (
                      <button type="button" className={s.next} onClick={() => go(i + 1)}>
                        Weiter
                      </button>
                    ) : (
                      <Link className={s.next} href={overview}>
                        Zur Übersicht
                      </Link>
                    )}
                  </div>
                ) : null}
                {enhanced && i < total - 1 ? (
                  <p className={s.exit}>
                    <Link href={overview}>Schließen – zur Übersicht</Link>
                  </p>
                ) : null}

                {scene.why ? (
                  <details className={s.why}>
                    <summary>{scene.why.title}</summary>
                    <p>{scene.why.copy}</p>
                  </details>
                ) : null}

                {scene.parentContext ? <p className={s.parent}>Für Eltern: {scene.parentContext}</p> : null}

                {preview ? (
                  <p className={s.reviewTag}>
                    Vorschau · {reviewState(scene)}
                  </p>
                ) : null}

              </div>
            </section>
          </li>
        ))}
      </ol>
      <p className={s.live} aria-live="polite">
        {announce}
      </p>
    </div>
  );
}
