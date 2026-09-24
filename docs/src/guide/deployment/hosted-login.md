# Hosted Login Pages

Authup serves its own login, consent, registration and password pages on the
IdP origin. An application never renders a login form: it sends the browser to
`/authorize`, and everything up to the redirect back with a `code` happens on
these pages. They are rendered by `@authup/server-auth-console`, which
`authup start` runs on the same listener as the API. In a
[split deployment](./console-replicas.md), `authup start console auth` runs it
alone.

| Page | Path | Purpose |
|------|------|---------|
| Login and consent | `/authorize` | Sign in, complete a second factor, grant consent |
| Registration | `/register` | Create an account (when enabled) |
| Activation | `/activate` | Confirm the email address of a new account |
| Password forgot | `/password-forgot` | Request a password reset mail |
| Password reset | `/password-reset` | Set a new password with the mailed code |
| Sign-out | `/logout` | RP-initiated logout (see [OAuth2](../development/api-oauth2#_6-rp-initiated-logout)) |
| Device verification | `/device` | Approve a device (see [OAuth2](../development/api-oauth2#_8-device-authorization-grant-rfc-8628)) |

Each path is answered by the API with a redirect to the same page under the
auth console's URL (`<publicUrl>/console/auth` by default), carrying the query
unchanged. A `POST` to the same path (`/register`, `/password-forgot`, ...) is
the JSON API the page itself calls, so a custom front end can drive the same
flows without the hosted pages.

The pages can be rebranded with a [theme](./theming.md), and replaced entirely
by substituting the package (`authConsole.path`).

## Choosing a realm

A user belongs to exactly one realm, and a user name is only unique within its
realm. Every login therefore happens against one realm, and where that realm
comes from depends on who started the login.

**An application's authorize request pins the realm.** The login form on
`/authorize` authenticates users of the client's own realm and shows no realm
picker. A client identified by its id needs nothing more. A client identified
by its name must be accompanied by the realm, because every realm can hold a
client of that name:

```
GET /authorize?client_id=my-app&realm_id=<realm id or name>&...
```

A user of another realm cannot sign in to that client. A lingering session of
another realm is shown as such, with an option to sign in with a different
account.

**The consoles pick the realm first.** The admin console and the
[account console](./account-console.md) show a realm chooser to a visitor
without a session, and start the login against the chosen realm's system
client. A deployment with a single realm skips the chooser. A link to the
account console can pin the realm up front with
`<publicUrl>/console/account?realmId=<id or name>`.

**A login without a client shows a realm picker on the form.** The device
verification page is the one hosted page that signs in without an
authorization request, so its login form lets the user pick the realm.

A token requested directly (the password grant, see
[OAuth2](../development/api-oauth2#_1-password-flow)) takes the realm as
`realm_id` / `realm_name` and falls back to the master realm when none is
given.

## Registration

Self-registration is off by default. Turn it on with:

```yaml
core:
    registrationEnabled: true
```

(`core.registrationEnabled` / `REGISTRATION_ENABLED`.) The login form then links
to `/register`, which asks for a user name, an email address and a password.
The password must be at least `core.passwordMinLength` characters long
(`PASSWORD_MIN_LENGTH`, default 10).

The account is created in the realm of the login it was started from: the
link from `/authorize` carries the client's realm as `realmId`. A registration
without a realm, for example a direct `POST /register`, creates the user in the
master realm.

With registration disabled, `/register` shows a "not enabled" notice instead
of the form, and `POST /register` is refused with the error code
`registration_disabled`.

### Email verification

By default a registered account is active immediately and the user can sign
in right away. To require a confirmed email address first, also enable email
verification and configure [SMTP](./configuration-server-core-smtp.md):

```yaml
core:
    registrationEnabled: true
    emailVerificationEnabled: true
smtp: 'smtps://user:password@smtp.example.com'
```

A registration then creates an inactive account and mails an activation code.
The mail links to `<publicUrl>/activate?token=<code>`, which activates the
account and marks the email address as verified. An inactive account cannot
sign in. If the mail cannot be sent, the account is removed again and the
registration fails, so a failed delivery never leaves an account nobody can
activate.

::: warning
Without an `smtp` setting, mails are discarded silently rather than failing.
Registration with email verification then succeeds, but no activation mail
arrives and the account stays inactive. Always configure SMTP together with
email verification.
:::

## Password recovery

Password recovery is off by default and needs email verification as well,
because the reset code is delivered by mail:

```yaml
core:
    passwordRecoveryEnabled: true
    emailVerificationEnabled: true
smtp: 'smtps://user:password@smtp.example.com'
```

(`PASSWORD_RECOVERY_ENABLED`, `EMAIL_VERIFICATION_ENABLED`.) With recovery
enabled but email verification off, a reset request is refused with the error
code `email_verification_required`.

The flow:

1. The login form links to `/password-forgot`. The user enters their user name
   or email address.
2. Authup mails a reset code, valid for 30 minutes. The mail links to
   `<publicUrl>/password-reset?token=<code>&realmId=<realm>`.
3. On `/password-reset` the user enters their user name or email address again
   and chooses a new password (at least `core.passwordMinLength` characters).

A code that has run out is refused with `reset_token_expired`; the user starts
again from step 1. With recovery disabled, both pages show a "not enabled"
notice and the endpoints refuse with `password_recovery_disabled`.

## Returning to the application

Every link from the login form to another page carries the original authorize
request as a `redirect` parameter, so "back to login" on the registration,
activation or password pages resumes the application's sign-in rather than
ending on a dead end. The parameter only accepts a path on the Authup origin,
never an absolute URL.

## Feature flags

Which of these flows are enabled is public. The status endpoint (`GET /`)
reports them under `features`, next to the console flags; see
[API](../development/api-introduction#status-endpoint). The hosted pages read
the same flags to decide which links to show.
