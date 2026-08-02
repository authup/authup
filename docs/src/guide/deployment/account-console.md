# Account Console

The account console is the end-user self-service surface, served by
`server-core` on the IdP origin at `<publicUrl>/account`. It works in every
deployment, including headless ones without the admin console, and gives
each of your applications a stable "Manage account" link target.

It covers:

| Page | Path | What a user can do |
|------|------|--------------------|
| Account | `/account` | Edit profile basics (name, display name, email) |
| Password | `/account/password` | Change the password |
| Authenticators | `/account/authenticators` | Enroll and remove second factors (TOTP, recovery codes, email, passkeys) |
| Sessions | `/account/sessions` | See active sessions, revoke one, or log out all other devices |
| Applications | `/account/applications` | Review and revoke granted application consents |

## Sign-in

The surface authenticates through a regular authorization-code + PKCE flow
against the per-realm `account-console` system client (see
[Provisioning](./provisioning.md#per-realm-system-clients)). A user visiting
`/account` without a session picks a realm (a single-realm deployment skips
the picker) and is redirected to the hosted login. An existing session on the
IdP origin is reused: no second session row is created, and the session is
attributed to the `account-console` client from then on.

A deep link may pin the realm up front: `<publicUrl>/account?realmId=<id-or-name>`.

## Restricting access

Binding an access policy to a realm's `account-console` client
(`accessPolicyId`) denies new sign-ins to the surface for identities that
fail the policy; a denied sign-in ends on a readable "access denied" page.
The same admission-control caveats as for the admin console apply (see the
tip in [Provisioning](./provisioning.md#per-realm-system-clients)).

## Disabling the surface

Operators with their own self-service portal can turn the surface off:

```dotenv
ACCOUNT_CONSOLE_ENABLED=false
```

(config key `accountConsoleEnabled`, default `true`.) The routes then serve
a localized "not enabled" notice instead of the surface, so stale links do
not dead-end. The flag is also reported in the `features` block of the
public status endpoint (`GET /`).
