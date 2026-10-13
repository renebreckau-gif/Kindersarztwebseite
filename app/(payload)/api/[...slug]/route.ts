/* Payload REST API (official Next.js integration). Every operation passes the collection
   access rules and hooks (src/backend); there is no unauthenticated write. GraphQL is disabled
   and has no route. Reachable only on STAGING with a configured database (proxy.ts). */
import config from "@payload-config";
import { REST_DELETE, REST_GET, REST_OPTIONS, REST_PATCH, REST_POST, REST_PUT } from "@payloadcms/next/routes";

export const GET = REST_GET(config);
export const POST = REST_POST(config);
export const DELETE = REST_DELETE(config);
export const PATCH = REST_PATCH(config);
export const PUT = REST_PUT(config);
export const OPTIONS = REST_OPTIONS(config);
