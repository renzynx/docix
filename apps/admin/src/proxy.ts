import { type NextRequest, NextResponse } from "next/server";

/**
 * Lightweight proxy for admin routes.
 *
 * This proxy only checks for the existence of a session cookie.
 * Actual permission verification happens in the dashboard layout (server component).
 *
 * Benefits:
 * - No API calls in proxy = fast
 * - Permission check happens once per page load in layout
 * - Better error handling in React components
 */
export function proxy(req: NextRequest) {
	const { pathname } = req.nextUrl;

	// Allow auth routes to pass through (login page, etc.)
	if (pathname.startsWith("/auth")) {
		return NextResponse.next();
	}

	// Allow static assets and Next.js internals
	if (
		pathname.startsWith("/_next") ||
		pathname.startsWith("/favicon") ||
		pathname.includes(".")
	) {
		return NextResponse.next();
	}

	const cookie = req.headers.get("cookie") || "";

	// Quick check: does the session cookie exist?
	const hasSession = cookie.includes("docix_session=");

	if (!hasSession) {
		// No session cookie - redirect to sign-in with callback
		const signInUrl = new URL("/auth/sign-in", req.url);
		signInUrl.searchParams.set("callbackUrl", pathname);
		return NextResponse.redirect(signInUrl);
	}

	// Session exists - let the request through
	// Permission verification happens in the dashboard layout
	return NextResponse.next();
}

export const config = {
	matcher: [
		/*
		 * Match all request paths except:
		 * - _next/static (static files)
		 * - _next/image (image optimization files)
		 * - favicon.ico (favicon file)
		 */
		"/((?!_next/static|_next/image|favicon.ico).*)",
	],
};
