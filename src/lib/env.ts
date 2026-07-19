import { z } from "zod";

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.url().default("http://localhost:3000"),
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

const serverEnvSchema = publicEnvSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;
export type ServerEnv = z.infer<typeof serverEnvSchema>;

const runtimePublicEnv = {
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
};

export function hasPublicSupabaseConfig(
  source: Record<string, string | undefined> = runtimePublicEnv,
): boolean {
  return Boolean(source.NEXT_PUBLIC_SUPABASE_URL && source.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function readPublicEnv(
  source: Record<string, string | undefined> = runtimePublicEnv,
): PublicEnv {
  const result = publicEnvSchema.safeParse(source);

  if (!result.success) {
    throw new Error(
      `Afrodita OS is not configured. Missing or invalid public environment variables: ${result.error.issues
        .map((issue) => issue.path.join("."))
        .join(", ")}`,
    );
  }

  return result.data;
}

export function readServerEnv(
  source: Record<string, string | undefined> = {
    ...runtimePublicEnv,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },
): ServerEnv {
  const result = serverEnvSchema.safeParse(source);

  if (!result.success) {
    throw new Error(
      `Afrodita OS trusted server environment is not configured: ${result.error.issues
        .map((issue) => issue.path.join("."))
        .join(", ")}`,
    );
  }

  return result.data;
}
