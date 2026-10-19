import { NextResponse, type NextRequest } from "next/server";

/**
 * Optimistic gate: bounces cookie-less visitors away from private pages before any rendering.
 * Real session validation always happens server-side in `requireUser()` / `authed()`.
 */
export function proxy(req: NextRequest) {
  if (!req.cookies.has("ms_session")) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/feed/:path*", "/saved/:path*", "/read-later/:path*", "/vault/:path*", "/topics/:path*", "/settings/:path*", "/read/:path*"],
};
