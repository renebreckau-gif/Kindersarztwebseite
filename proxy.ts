// Request gate for the internal backend (Next.js 16 proxy, runs before any route module).
//
// /intern, /intern/admin and /api exist only while SITE_STAGE allows staging tools AND this
// deployment has a configured database. Otherwise they answer 404 — so a deployment without a
// database (Vercel staging today) or a PRODUCTION stage never exposes or evaluates the backend.
// Public pages are not matched and never depend on the database.

import { NextResponse, type NextRequest } from "next/server";
import { SITE_STAGE } from "./src/content/release.ts";
import { internAvailable, isClosedRegistrationPath } from "./src/backend/gate.ts";

const notFound = () =>
  new NextResponse("Nicht gefunden", { status: 404, headers: { "X-Robots-Tag": "noindex, nofollow", "Content-Type": "text/plain; charset=utf-8" } });

export function proxy(req: NextRequest) {
  if (!internAvailable(SITE_STAGE, process.env)) return notFound();
  if (isClosedRegistrationPath(req.nextUrl.pathname)) return notFound();
  return NextResponse.next();
}

export const config = {
  matcher: ["/intern", "/intern/:path*", "/api", "/api/:path*"],
};
