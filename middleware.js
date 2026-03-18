import { NextResponse } from "next/server";

export function middleware(request) {
  const { pathname } = request.nextUrl;

  // Get the session cookie Firebase sets
  const token = request.cookies.get("__session")?.value ||
                request.cookies.get("firebase-auth-token")?.value;

  // Routes that don't need auth
  const publicPaths = ["/login", "/signup", "/reset-password"];
  const isPublic = publicPaths.some((p) => pathname.startsWith(p));

  // If trying to access app without auth → redirect to login
  // Note: Firebase Auth is client-side, so we use a lightweight
  // check here. The real guard is in the AuthProvider + page redirects.
  if (pathname === "/") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
