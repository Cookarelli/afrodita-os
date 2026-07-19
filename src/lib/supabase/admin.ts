import { createClient } from "@supabase/supabase-js";
import { readServerEnv } from "@/lib/env";

export function createSupabaseAdminClient() {
  if (typeof window !== "undefined") {
    throw new Error("The Supabase service-role client is server-only.");
  }
  const { NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = readServerEnv();

  return createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
