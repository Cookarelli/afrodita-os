import { bootstrapSuperAdmin } from "@/lib/auth/bootstrap-admin";

function readEmailArgument(args: string[]) {
  const emailIndex = args.indexOf("--email");
  const email = emailIndex >= 0 ? args[emailIndex + 1] : undefined;
  if (!email || email.startsWith("--")) {
    throw new Error("Usage: npm run bootstrap:admin -- --email admin@example.com");
  }
  return email;
}

async function main() {
  const result = await bootstrapSuperAdmin({ email: readEmailArgument(process.argv.slice(2)) });
  console.log(
    JSON.stringify({
      status: "Administrator provisioning completed.",
      emailInvitationSent: result.emailInvitationSent,
      organizationCreated: result.organizationCreated,
      profileCreated: result.profileCreated,
      membershipCreated: result.membershipCreated,
      roleAssigned: result.roleAssigned,
    }),
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Administrator provisioning failed.");
  process.exitCode = 1;
});
