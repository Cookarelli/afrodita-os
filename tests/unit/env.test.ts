import { describe, expect, it } from "vitest";
import { readPublicEnv } from "../../src/lib/env";

describe("readPublicEnv", () => {
  it("fails closed when Supabase configuration is absent", () => {
    expect(() => readPublicEnv({})).toThrow(/not configured/i);
  });

  it("accepts valid public configuration", () => {
    expect(
      readPublicEnv({
        NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
      }),
    ).toEqual({
      NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
    });
  });
});
