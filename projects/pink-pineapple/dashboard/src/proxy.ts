/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { varifyToken } from "./utils/verifyToken";
import { TUser } from "./redux/features/auth/authSlice";

export async function proxy(request: NextRequest) {
  const cookieStore = await cookies();
  const token: any = cookieStore.get("token")?.value;
  const currentPath = request.nextUrl.pathname;

  if (currentPath === "/login") {
    return NextResponse.next();
  }

  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const user = varifyToken(token) as TUser;

  if (user.role === "ADMIN" && currentPath.startsWith("/club")) {
    return NextResponse.redirect(new URL("/not-authorized", request.url));
  }

  // Shared routes both ADMIN and CLUB can access. Today this is just the
  // Attribution analytics page — backend scopes data per role (ADMIN sees
  // all venues, CLUB sees only their owned venues), so the same UI safely
  // serves both. Add more shared routes here if/when needed.
  const sharedPaths = ["/analytics"];
  const isShared = sharedPaths.some((p) => currentPath.startsWith(p));

  if (user.role === "CLUB" && !currentPath.startsWith("/club") && !isShared) {
    return NextResponse.redirect(new URL("/not-authorized", request.url));
  }

  return NextResponse.next();
}

// "Matching Paths" — exclude auth pages, system routes (_next, api), AND
// any path containing a file extension (.jpg, .png, .svg, .ico, .css, etc.)
// so static assets in /public/images/ and /public/placeholders/ aren't
// gated by auth and redirected to /login. This is why the Pink Pineapple
// logo wasn't rendering before — the middleware was intercepting requests
// to /images/logo_primary_dark.jpg and redirecting unauth'd visitors.
export const config = {
  matcher: [
    "/((?!login|forgot-password|register|verify-otp|reset-password|not-authorized|_next|api|.*\\.).*)",
  ],
};
