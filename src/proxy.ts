import type { NextRequest } from "next/server";
import { refreshSupabaseSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return refreshSupabaseSession(request);
}

export const config = {
  matcher: [
    "/os/:path*",
    "/property-manager/:path*",
    "/auth/:path*",
    "/login",
    "/forgot-password",
    "/reset-password",
    "/accept-invitation",
  ],
};
