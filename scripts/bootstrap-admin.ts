import { bootstrapSuperAdmin } from "@/lib/auth/bootstrap-admin";
import { chmod, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const credentialsPath = resolve(process.cwd(), ".bootstrap-admin-credentials.local");

async function writeTemporaryCredentials(email: string, temporaryPassword: string) {
  await writeFile(
    credentialsPath,
    `email=${email}\ntemporary_password=${temporaryPassword}\nChange this password immediately after signing in.\n`,
    { encoding: "utf8", flag: "wx", mode: 0o600 },
  );
  await chmod(credentialsPath, 0o600);
}

function readEmailArgument(args: string[]) {
  const emailIndex = args.indexOf("--email");
  const email = emailIndex >= 0 ? args[emailIndex + 1] : undefined;
  if (!email || email.startsWith("--")) {
    throw new Error("Usage: npm run bootstrap:admin -- --email admin@example.com");
  }
  return email;
}

async function main() {
  const email = readEmailArgument(process.argv.slice(2));
  const result = await bootstrapSuperAdmin({ email });
  if (result.temporaryPassword) await writeTemporaryCredentials(email, result.temporaryPassword);
  console.log(
    JSON.stringify({
      status: "Administrator provisioning completed.",
      authUserCreated: result.authUserCreated,
      existingAuthUserReused: result.existingAuthUserReused,
      emailInvitationSent: result.emailInvitationSent,
      invitationAttempted: result.invitationAttempted,
      rateLimitFallbackUsed: result.rateLimitFallbackUsed,
      organizationCreated: result.organizationCreated,
      profileCreated: result.profileCreated,
      membershipCreated: result.membershipCreated,
      roleAssigned: result.roleAssigned,
      credentialsFileWritten: Boolean(result.temporaryPassword),
    }),
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Administrator provisioning failed.");
  process.exitCode = 1;
});
