// Media frames and the placeholder system (docs/design/placeholder-system.md).
// Media class (REAL / PLACEHOLDER / AI_CONCEPTUAL) is always explicit.

import s from "./media.module.css";

export type MediaClass = "REAL" | "PLACEHOLDER" | "AI_CONCEPTUAL";
export type PlaceholderKind = "portrait" | "team" | "room" | "child" | "video" | "model3d";

const KIND_LABEL: Record<PlaceholderKind, string> = {
  portrait: "Porträt",
  team: "Teamfoto",
  room: "Praxisraum",
  child: "Kindheit (konzeptuell)",
  video: "Video",
  model3d: "3D-Objekt",
};

const RATIO: Record<PlaceholderKind, string> = {
  portrait: "4 / 5",
  team: "3 / 2",
  room: "3 / 2",
  child: "4 / 3",
  video: "16 / 9",
  model3d: "1 / 1",
};

const CLASS_BADGE: Record<MediaClass, string> = {
  REAL: "Echt",
  PLACEHOLDER: "Platzhalter",
  AI_CONCEPTUAL: "KI-Konzept",
};

/**
 * Placeholder frame: an intentional graphic, never a fake photo.
 * `showClass` renders the internal class badge (development / review builds).
 */
export function MediaFrame({
  kind,
  mediaClass = "PLACEHOLDER",
  showClass = true,
  caption,
}: {
  kind: PlaceholderKind;
  mediaClass?: MediaClass;
  showClass?: boolean;
  caption?: string;
}) {
  return (
    <figure className={s.figure}>
      <div className={`${s.frame} ${s[`k-${kind}`]} ${s[`c-${mediaClass}`]}`} style={{ aspectRatio: RATIO[kind] }} role="img" aria-label={`${CLASS_BADGE[mediaClass]}: ${KIND_LABEL[kind]}`}>
        <span className={s.glyph} aria-hidden="true" />
        <span className={s.kind} aria-hidden="true">
          {KIND_LABEL[kind]}
        </span>
        {showClass ? (
          <span className={`${s.badge} ${s[`b-${mediaClass}`]}`} aria-hidden="true">
            {CLASS_BADGE[mediaClass]}
          </span>
        ) : null}
      </div>
      {caption ? <figcaption className={s.caption}>{caption}</figcaption> : null}
    </figure>
  );
}
