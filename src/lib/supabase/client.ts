"use client";

import { createBrowserClient } from "@supabase/ssr";
import { readPublicEnv } from "@/lib/env";

export function createSupabaseBrowserClient() {
  const { NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_SUPABASE_URL } = readPublicEnv();
  return createBrowserClient(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
