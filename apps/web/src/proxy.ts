import { type NextRequest, NextResponse } from "next/server";

export async function proxy(req: NextRequest) {
	const cookie = req.headers.get("cookie") || "";

	const cookieName = "docix_session";

	const sessionCookie = cookie
		.split("; ")
		.find((c) => c.startsWith(`${cookieName}=`));

	if (!sessionCookie) {
		return NextResponse.redirect(new URL("/auth/sign-in", req.url));
	}

	return NextResponse.next();
}

export const config = {
	matcher: ["/admin/:path*", "/account/:path*"],
};
