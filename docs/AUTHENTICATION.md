# Authentication

Afrodita OS uses Supabase email/password authentication with invitation-only
onboarding. Public registration is disabled in `supabase/config.toml`, and no
sign-up route exists.

## Account lifecycle

1. A pending `profiles` row may exist without an Auth user or email.
2. A super admin or owner admin supplies an email and creates an expiring
   `invitations` row. Only a super admin may invite a full administrator.
3. The trusted server calls `auth.admin.inviteUserByEmail`; the service-role key
   never enters browser code.
4. Supabase verifies the emailed link, and `/auth/callback` exchanges its code for
   a session.
5. `/accept-invitation` hashes the application token and calls the transactional
   `accept_invitation` RPC.
6. The RPC verifies status, expiry, authenticated email, and token hash; links or
   creates the profile; activates memberships; assigns the role; consumes the
   invitation; and writes an activity event.

Raw invitation tokens are never stored. Pending invitations expire after 72
hours in the server helper. `expire_invitations()` is executable only by the
service role and is intended for a scheduled trusted-server job.

## Sign-in and recovery

- `/login` uses `signInWithPassword` and a validated local `next` path.
- `/staff/login` redirects to the internal login target.
- `/property-manager/login` redirects to the tenant portal target.
- `/forgot-password` returns the same response whether an email exists.
- `/auth/callback` exchanges the PKCE code and allows same-origin redirects only.
- `/reset-password` requires the reset session and matching passwords of at least
  12 characters.
- Logout invalidates the Supabase session and returns to `/login`.

No password, reset token, access token, or email-link token is logged.

## Sessions and disabled accounts

`src/proxy.ts` refreshes cookies on authentication and protected routes. Every
protected layout then calls `getUser()` server-side, loads active memberships and
roles, and evaluates centralized permissions.

Missing Supabase configuration throws a clear error. Missing profiles, disabled
profiles, and disabled organization memberships never fall back to demo access;
they are sent to `/account-disabled`. Permission failures go to `/unauthorized`.
RLS independently enforces the same boundaries.

## Configuration and types

Only placeholders belong in `.env.example`: public Supabase URL/anon key,
server-only service-role key, and canonical site URL. The service client lives in
a `server-only` module.

After the local Supabase stack is running:

```bash
npm run db:reset
npm run db:types
```

`db:types` generates `src/lib/supabase/database.types.ts` from PostgreSQL. Do not
hand-maintain a competing database model. Migrations were validated with local
PostgreSQL 16 in this environment; type generation remains prepared but pending
because the Supabase CLI requires a running Docker daemon.
