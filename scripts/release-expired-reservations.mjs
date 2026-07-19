import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
  process.exitCode = 1;
} else {
  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.rpc("release_expired_reservations", { batch_size: 100 });
  if (error) {
    console.error(`Reservation release failed: ${error.message}`);
    process.exitCode = 1;
  } else {
    console.log(`Released ${data} expired reservation(s).`);
  }
}
