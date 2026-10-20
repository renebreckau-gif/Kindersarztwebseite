// The ONE optional homepage notice below PRAXIS PULS (Phase 10.0A, Variant B).
// Renders a view model from selectHomepageHighlight — no selection logic here. Nothing at all is
// rendered without a highlight (no placeholder, no "keine Hinweise"). Part of the normal page
// flow: no alert role, no live region, no popup.

import { Icon } from "@/design-system/icons";
import type { HomepageHighlight } from "@/content/homepage-highlight";
import s from "./homepage-highlight.module.css";

export function HomepageHighlightCard({ highlight }: { highlight: HomepageHighlight | null }) {
  if (!highlight) return null;
  return (
    <aside className={s.card} data-tone={highlight.tone} aria-labelledby="startseite-hinweis">
      <span className={s.icon} aria-hidden="true">
        <Icon name={highlight.tone === "closure" ? "calendar" : "info"} size={20} />
      </span>
      <div className={s.body}>
        <p className={s.eyebrow}>{highlight.eyebrow}</p>
        <p id="startseite-hinweis" className={s.title}>
          {highlight.title}
        </p>
        {highlight.detail ? <p className={s.detail}>{highlight.detail}</p> : null}
        {/* one link; its hit area covers the whole card (::after) */}
        <a className={s.link} href={highlight.href}>
          {highlight.linkLabel}
          <span className="visually-hidden">{`: ${highlight.title}`}</span>
        </a>
      </div>
    </aside>
  );
}
