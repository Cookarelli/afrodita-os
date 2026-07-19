import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const path = new URL(request.url).searchParams.get("path");
  if (!path || path.length > 500 || path.startsWith("/") || path.includes(".."))
    return NextResponse.json({ error: "Invalid photo path." }, { status: 400 });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.json({ error: "Photo unavailable." }, { status: 404 });
  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.storage.from("appliance-photos").download(path);
  if (error) return NextResponse.json({ error: "Photo unavailable." }, { status: 404 });
  return new Response(await data.arrayBuffer(), {
    headers: {
      "content-type": data.type || "application/octet-stream",
      "cache-control": "public, max-age=300, stale-while-revalidate=3600",
      "x-content-type-options": "nosniff",
    },
  });
}
