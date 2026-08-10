import NextAuth from "next-auth";
import { NextResponse } from "next/server";

import { authConfig } from "@/lib/auth.config";

// Deliberately built on the edge-safe authConfig (no Prisma/bcrypt) rather than the full
// lib/auth.ts — this file runs in the Edge runtime and Prisma's generated client pulls in
// Node-only built-ins that Edge can't load. See lib/auth.config.ts for why.
const { auth } = NextAuth(authConfig);

const ADMIN_PREFIX = "/admin";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  if (!session) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname.startsWith(ADMIN_PREFIX) && session.user.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl.origin));
  }

  return NextResponse.next();
});

// Matches every route inside the (app) and (admin) route groups. Route groups don't
// add a URL segment, so these paths are what actually gets requested.
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/profile/:path*",
    "/settings/:path*",
    "/wallet/:path*",
    "/events/:path*",
    "/my-events/:path*",
    "/applications/:path*",
    "/facilitators/:path*",
    "/notifications/:path*",
    "/calendar/:path*",
    "/search/:path*",
    "/chat/:path*",
    "/merged-trainings/:path*",
    "/admin/:path*",
  ],
};
