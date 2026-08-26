# Account Console

The account console is the end-user self-service surface. It is a
client-side single-page application (the `@authup/client-account-console`
package) that `server-core` serves on the IdP origin at
`<publicUrl>/console/account` by default. It works in every deployment, including
ones that run with the admin console disabled, and gives each of your
applications a stable "Manage account" link target.

It covers:

| Page | Path | What a user can do |
|------|------|--------------------|
| Account | `/console/account` | Edit profile basics (name, display name, email) |
| Password | `/console/account/password` | Change the password |
| Authenticators | `/console/account/authenticators` | Enroll and remove second factors (TOTP, recovery codes, email, passkeys) |
| Connected accounts | `/console/account/connected-accounts` | Link and unlink external identity-provider accounts (e.g. Facebook, Google, any OAuth2/OIDC provider of the realm) |
| Sessions | `/console/account/sessions` | See active sessions, revoke one, or log out all other devices |
| Applications | `/console/account/applications` | Review and revoke granted application consents |

## Sign-in

The surface authenticates through a regular authorization-code + PKCE flow
against the per-realm `account-console` system client (see
[Provisioning](./provisioning.md#per-realm-system-clients)). A user visiting
`/console/account` without a session picks a realm (a single-realm deployment skips
the picker) and is redirected to the hosted login. An existing session on the
IdP origin is reused, so no second session row is created. Attribution is per
token (`auth_session_tokens.client_id`), so the tokens the account console
obtains name the `account-console` client. The session row itself records no
application: its `client_id` is a subject foreign key and stays null for a
user's session.

A deep link may pin the realm up front: `<publicUrl>/console/account?realmId=<id-or-name>`.

## Connected accounts

The connected-accounts page lists the realm's enabled OAuth2/OIDC identity
providers. Connecting one sends the user through the external provider and
binds the returned external identity to the CURRENT user, so future logins
through that provider land on this account instead of creating a new user.
An external identity that is already linked to another user is rejected.

Disconnecting removes the link. The last linked account of a user without a
password cannot be disconnected: it may be the only way into the account.
Set a password first.

Administrators see a user's linked accounts on the user detail page of the
[admin console](./configuration-client-admin-console.md) (permissions
`identity_provider_account_read` / `identity_provider_account_delete`); the
API surface is
`GET /identity-provider-accounts` and `DELETE /identity-provider-accounts/:id`,
self-scoped for callers without the read permission.

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

(`server.accountConsole.enabled` / `ACCOUNT_CONSOLE_ENABLED`, default `true`.) The routes then serve
a localized "not enabled" notice instead of the surface, so stale links do
not dead-end. The flag is also reported in the `features` block of the
public status endpoint (`GET /`).

## Standalone hosting

The console is an ordinary OAuth2 relying party, so the same built bundle
can be hosted on any static host or another origin instead of (or in
addition to) the embedded serving:

1. Take the `dist/` directory of the `@authup/client-account-console`
   package and serve it under a path of your host, `/console/account` by default.
2. Inject the runtime configuration by replacing the
   `<!--account-config-->` marker in `index.html` (or by any script that
   runs before the app bundle):

   ```html
   <script>
   window.__AUTHUP__ = {
       "apiUrl": "https://auth.example.com",
       "basePath": "/console/account"
   };
   </script>
   ```

   `apiUrl` is the authup server's public URL. Without injected
   configuration the app assumes it is served by (or proxied to) the authup
   origin itself and derives the API URL from its own location.
3. Register the host's origin in the authup server's `TRUSTED_ORIGINS`.
   The per-realm `account-console` client's redirect and post-logout
   allowlists derive from that origin set, so sign-in and sign-out
   round-trips are permitted on the next start.

Session continuity is preserved on a foreign origin: the login happens on
the hosted authorize page either way, and the code exchange reuses the
session created there.
