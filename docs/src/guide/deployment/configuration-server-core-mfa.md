# Multi-factor authentication

Authup supports TOTP, recovery codes, email codes, and WebAuthn credentials as
second factors. Enable the feature with `mfaEnabled` (`MFA_ENABLED`) and require
interactive enrollment for every local user with `mfaRequired`
(`MFA_REQUIRED`). `mfaRequired` can only be enabled together with `mfaEnabled`.

Users enroll and remove their authenticators themselves on the
[account console](./account-console.md) (`<publicUrl>/account/authenticators`),
which is served by `server-core` and therefore also available in headless
deployments. Inline enrollment during login rides the hosted `/authorize` page
(below).

## Enforcement model

With MFA enabled, a local user who has any confirmed authenticator must complete
a second-factor challenge during password login and before authorization-code
issuance. `mfaRequired` additionally routes a device-less user through inline
enrollment on the hosted `/authorize` page.

A federated identity-provider login is held to the same rule. The external
callback establishes the session and returns the browser to the hosted
`/authorize` page, which challenges the user's confirmed authenticators (and
routes a device-less user through inline enrollment under `mfaRequired`) before
the application's authorization code is issued. The upstream credential alone
does not clear a factor enrolled on the Authup account, and the issued tokens
report both the external authentication and the local OTP proof.

The following boundaries are intentional:

- Setting `mfaEnabled` to `false` disables both local MFA configuration and
  enforcement, including for users who already have confirmed authenticators.
  Authenticator rows are retained and become active again when MFA is
  re-enabled. Treat disabling this option as an authentication-policy
  downgrade.
- The direct resource-owner password grant permits a device-less user to obtain
  the initial session even when `mfaRequired` is enabled. The hosted login uses
  that same bootstrap session to reach inline enrollment, which cannot be
  completed inside a single password-grant request. Restrict the `password`
  grant with each client's `grantTypes` allowlist and use the authorization
  code flow when enrollment must be enforced before issuing an application
  token.

An external login that continues through the hosted authorization flow can
still encounter the normal `/authorize` MFA backstop before a later client
authorization code is issued. The bootstrap session created by the external
callback itself is not locally MFA-gated.

## Cache availability

MFA verification uses a per-user cache lock to serialize factor consumption.
The lock has an owner token and is renewed while verification is in progress;
renewal and release are conditional on that token so an expired owner cannot
extend or delete a successor's lock.

Verification fails closed when the cache or lock is unavailable. This applies
even to TOTP and recovery codes, whose counters and `used_at` stamps provide a
persistent replay backstop, because allowing concurrent read-verify-save
sections during an outage could accept the same factor twice. A configured
Redis deployment should therefore include Redis availability in the login-path
service-level objective.

The same fail-closed posture applies to the per-account attempt throttle that
guards enrollment confirmation and challenge-code delivery: when the throttle
counter cannot be read, those endpoints degrade to a retry-able throttled
response (HTTP 429) rather than surfacing the outage as an internal 500.

## Related settings

- `mfaFreshnessMaxAge` (`MFA_FRESHNESS_MAX_AGE`) controls how long a session's
  MFA proof satisfies an explicit `acr_values=urn:authup:mfa` step-up request.
- `mfaTicketMaxAge` (`MFA_TICKET_MAX_AGE`) controls the short-lived pending
  login ticket used by email and WebAuthn challenges.
- Email authentication requires an SMTP transport. WebAuthn uses `publicUrl` as
  its relying-party origin.

See the [server configuration reference](./configuration-server-core.md) for
all configuration formats and defaults.
