// Deployment environment switches (server-side, read per request).
//
// REVIEW_HUB_ENABLED=true marks a staging / review deployment: the /review hub is available and
// ENTDECKEN shows chapters in review mode. Default OFF — the final production deployment does
// not set it, so the formal release gates (src/content/release.ts) alone decide what is public.

export function isReviewEnvironment(env: Record<string, string | undefined> = process.env): boolean {
  return env.REVIEW_HUB_ENABLED === "true";
}
