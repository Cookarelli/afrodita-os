# User Invitations

Afrodita OS never guesses an email or creates an Auth user before an invitation
is ready. Named people may have a pending profile without an `auth_user_id`.

## Initial staff

| Person        | Pending role          | Required owner action                    |
| ------------- | --------------------- | ---------------------------------------- |
| Steven Cook   | `super_admin`         | supply and confirm his email             |
| Erika Cedillo | `owner_admin`         | supply her email; it must not be guessed |
| Mikey Jones   | `sales_manager`       | supply and confirm his email             |
| Carlo         | `delivery_technician` | supply email; last name remains nullable |

The development seed creates pending directory profiles for these four names and
separate fictional profiles covering every role. It creates no Auth users,
passwords, or production emails.

## Administrator procedure

1. Sign in as an authorized super admin. Owner admins may invite ordinary staff,
   but only super admins may grant `super_admin` or `owner_admin`.
2. Verify the person's email out of band.
3. Select the pending profile, organization, role, and property company when
   applicable.
4. Create the invitation through the trusted server helper. Never paste a service
   key or email-link token into Codex or source control.
5. Ask the recipient to use the link within 72 hours and set a unique password.
6. Verify profile, membership, role, invitation status, and activity event.

Property-manager roles require a company. The database requires active Afrodita
membership, active company membership, and a company-scoped role. Future company
admin invitations must remain capped to their company and Afrodita controls.

Revoke a pending invitation rather than deleting it. Disable the profile or
membership to remove access immediately while retaining history. Role assignments
use `revoked_at` and are never silently overwritten.
