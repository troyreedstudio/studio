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

  if (user.role === "CLUB" && !currentPath.startsWith("/club")) {
    return NextResponse.redirect(new URL("/not-authorized", request.url));
  }

  return NextResponse.next();
}

// "Matching Paths"
export const config = {
  matcher: [
    "/((?!login|forgot-password|register|verify-otp|reset-password|not-authorized|_next|api).*)",
  ],
};
