import { AuthCallbackClient } from "@/components/auth/auth-callback-client";
import { safeRedirectPath } from "@/lib/auth/route-permissions";

type AuthCallbackPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AuthCallbackPage({ searchParams }: AuthCallbackPageProps) {
  const query = await searchParams;
  const next = safeRedirectPath(typeof query.next === "string" ? query.next : null, "/os");
  const code = typeof query.code === "string" ? query.code : null;
  const type = typeof query.type === "string" ? query.type : null;

  return <AuthCallbackClient code={code} next={next} type={type} />;
}
