# Upgrading

This page collects **action-required** notes for upgrading an existing deployment.
Entries are grouped by release, newest first. Routine changes (features, fixes) live in the
[changelog](https://github.com/authup/authup/blob/master/CHANGELOG.md); anything listed here
either requires operator action or deliberately changes behavior.

## Next release (after v1.0.0-beta.62)

### `email_verified` is a real column, and every existing user starts unverified

The OIDC `email_verified` claim was mapped onto `auth_users.active`, the account
enable flag, which says nothing about the address. It was wrong in both
directions: registration sets `active` outright when `EMAIL_VERIFICATION_ENABLED`
is off (the default), and a federated or provisioned user is created active with
a synthesized `<name>@example.com`, so authup asserted a verified address that
had never received anything; conversely, deactivating a user who *had* completed
activation flipped the claim back to false.

It now has its own column, `auth_users.email_verified`, set by the activation
round-trip. The migration backfills **false for every existing row**, including
users who genuinely activated: `activate_hash` is null both after a completed
activation and for a user who was never asked to verify, so no existing row can
be proven verified.

**Action required if a relying party reads the claim.** Anything gating on
`email_verified: true` — account linking by email address is the usual case —
stops matching until the addresses are verified again, or vouched for. The field
is admin-settable (`POST /users/:id` with `{"emailVerified": true}` — the update verb
authup serves is POST, not PATCH — and a
switch in the admin console's user form), so an operator can restore it for
addresses they trust. It is on the `system.user-names-self-manage` denylist, so a
user cannot set it on themselves, and it is cleared automatically when a user's
email address changes.

If you were relying on the old behaviour to mean anything, note that it did not:
on a default deployment it read `true` for every self-registered user.

### The introspection response omits a claim instead of answering `null`

`POST /token/introspect`, `GET /sessions/@me/introspect` and every id_token
mapped nullable user columns straight onto OIDC claims, so a user without a
display name answered `nickname: null`. OIDC models an unavailable claim as an
omitted key, so those claims are now absent rather than null. A consumer testing
`payload.nickname === null` should test for absence (`== null` covers both).

The claims are also declared on `OAuth2TokenIntrospectionResponse` now
(`OpenIDClaims` in `@authup/specs`), so a TypeScript consumer reading `email`,
`nickname`, `preferred_username`, `given_name`, `family_name` or `updated_at`
gets a real type instead of `any`.

### The configuration file is `authup.yml`

The `.conf` file family is retired. One file is discovered now, `authup.yml` (or
`.yaml`, `.json`, `.js`, `.mjs`, `.cjs`, `.ts`, `.mts`), in the working directory
or under `--configDirectory`. `--configFile` still names one or more explicit
files.

`authup.conf` and `authup.server.core.conf` are **not read any more**. A stray
one left in the discovery directory is not an error: the server logs one
warning at startup and boots on its defaults. Naming one explicitly with
`--configFile` is refused outright, because it would load and then silently
drop every key that moved out of the `server.core` section, leaving the
service on a derived issuer and an empty database while the rest of the file
applied.

Keys moved as well. Everything a service reads lives in that service's own
section (`core` for `server/core`), and the deployment-wide options moved
up to the top level:

| Was | Is |
|---|---|
| `server.core.publicUrl` | `publicUrl` |
| `server.core.db` | `db` |
| `server.core.redis` | `redis` |
| `server.core.smtp` | `smtp` |
| `server.core.trustedOrigins` | `trustedOrigins` |
| `server.core.themeDirectoryPath` | `theme.directoryPath` |
| `server.core.themeFragmentsEnabled` | `theme.fragmentsEnabled` |
| `server.core.adminConsoleEnabled` | `adminConsole.enabled` |
| `server.core.adminConsolePath` | `adminConsole.path` |
| `server.core.accountConsoleEnabled` | `accountConsole.enabled` |
| `server.core.accountConsolePath` | `accountConsole.path` |
| `server.core.authConsolePath` | `authConsole.path` |

`env` and `rootPath` are top-level too. Every other option keeps its name under
`core`.

The shared-section walk is gone with the file family. `db`, `redis` and `smtp`
used to be looked up at the top level, under `server.*` and under `server.core.*`,
with the most specific declaration winning. Each has exactly one place now, the
top level.

**Action required** for a deployment that uses a configuration file. Rewrite it as
`authup.yml` per the table above; see [Configuration](./configuration.md) for the
document layout. `authup config validate` reads the file and the environment and
reports what does not hold, a key left at its old location included, so a
rewrite can be checked before it is deployed; `authup config schema` prints the
JSON Schema your editor can validate against while you type.

**No action** for a deployment configured through the environment. No environment
variable name changed, so a `docker run -e`, a Compose `environment:` block, a Helm
values file and a `.env` are all unaffected.

### `authup` is the operator binary, and it runs the server in process

The `authup-server` binary is retired. The `@authup/server-core` package ships
no binary at all now; the `authup` package (`npm install authup`) carries the
operator commands and runs the server **inside its own process**, where it used
to start it as a child and supervise it. (Each console service ships an
`authup-<name>-console` binary as well, for a deployment that runs one console
without the CLI; see the console entries below.)

| Was | Is |
|---|---|
| `authup-server start` | `authup start` |
| `authup-server worker` | `authup worker` |
| `authup-server migration run` | `authup migration run` |
| `authup-server healthcheck` | `authup healthcheck` |

**Containers need no change.** The entrypoint vocabulary is unchanged:
`server/core start`, `server/core worker` and `server/core migration run` all
still work, and the image runs the `authup` CLI underneath. A Compose file, a
Helm values file or a `docker run` line that names `server/core <command>` is
already correct.

**Action required** for anything that invoked the binary by name: a systemd
unit, a PM2 config, a Procfile, a CI step or an `npm` script naming
`authup-server`. Install the `authup` package and use the commands in the
table. `authup worker` is new on this path: the worker role was previously
reachable through the `authup-server` binary only, and the CLI could not start
it.

**`PORT` and `HOST` now follow the normal precedence.** The supervisor always
forced them onto the child, taking the value from the `server.core` section of
the configuration file (or the defaults) and overriding whatever the
environment said. They are ordinary options again, so the
[layering](./configuration.md#layers-precedence) applies: an environment
variable beats the configuration file. That is what a PaaS injecting `PORT`
expects, and it is what every other option already did.

**Action required** for a deployment that set `PORT` or `HOST` in the
environment while ALSO naming `server.core.port` / `server.core.host` in the
configuration file, and relied on the file winning. The two now disagree in
the other direction. Drop one of them.

**Package selectors are gone.** `authup start server.core` and
`authup start client.admin-console` are refused as an unexpected argument;
`start` and `worker` take no positional argument, because the CLI starts
exactly one service. A `client.admin-console` section in the configuration
file is not read (it printed a deprecation warning before). Remove both.

Two smaller things need no action. `authup migration run` finds its migration
files wherever it is started from, so on a normal install the working directory
no longer has to be the installed server package. And signal handling reaches
the server directly instead of being forwarded: `SIGINT`/`SIGTERM` tear the
application down and exit with its outcome, a second signal exits immediately,
and a teardown outlasting 10 seconds is forced.

### The default HTTP port is 3000

`core.port` defaults to `3000` instead of `3001`. This aligns the
default with what the container has always done: every published compose file
maps `3001:3000`, so the process inside has listened on 3000 all along and
only the host-side port was 3001.

**No action** for a Docker deployment, whose port mapping is unchanged, or for
any deployment that names `core.port` (or `PORT`) explicitly.

**Action required** for a bare-metal deployment that relied on the default and
hard-codes `3001` anywhere a client reaches: a reverse proxy upstream, a
`publicUrl`, a health check. Either set `core.port: 3001` to keep the
old address, or move those references to 3000.

The admin console's development server moves from `:3000` to `:3010` so it no
longer collides with the API, and the trusted origin seeded in non-production
follows it. That affects `npm run dev` in this repository only.

### The consoles are their own services

`server-core` serves no console any more. Each console is a service package of
its own (`@authup/server-auth-console` for the hosted login, consent, register,
activate and password pages, plus `@authup/server-admin-console` and
`@authup/server-account-console`), and `server-core` is the protocol surface
and the management API. What it keeps under `/console` is two routes per static
console, `GET /console/<name>/login/start` and `GET /console/<name>/callback`:
they are the cookie-mode sign-in, and the pending-login cookie has to be issued
by the origin that reads it back. The six hosted page GETs answer a redirect to
the auth console, carrying the request's own query.

The CLI gained two roles for it:

| Command | Runs |
|---|---|
| `authup start` (unchanged default) | the API and every enabled console on one listener |
| `authup core` | the API and the IdP alone, mounting no console |
| `authup console [admin\|account\|auth]` | one console service, or every enabled one, each on its own port (`3020` auth, `3021` admin, `3022` account) |

**No action** for a deployment running `server/core start`: the process, the
port, the paths and the container command are all unchanged, and the consoles
now run as separate services inside it.

**Action required** for:

- **A split deployment.** The flag-only recipe (both sets running `start` with
  the console flags inverted) no longer produces the intended split, and the
  flags must now stay `true` on both sets. Use `core` and `console` instead;
  [Console Replicas](./console-replicas.md) is rewritten around them, including
  the two sign-in paths that must keep reaching the API set.
- **A themed deployment.** `theme.directoryPath` and `theme.fragmentsEnabled`
  are read by the console services now. In one container nothing changes; in a
  split one, mount the theme directory into the console containers.
- **A substituted console.** `server.<name>Console.path` moved to the console
  services with the serving. Setting it on an API-only process does nothing.
  The auth console is themed as well since this release, which is what closes
  the one window in which the hosted auth pages rendered unthemed.

**New options**, all per console: `url` (`*_CONSOLE_URL`, where the console is
published; the path may differ from `publicUrl`, the origin may not), `port`
(`*_CONSOLE_PORT`) and `host` (`*_CONSOLE_HOST`, inheriting the deployment-wide
`HOST`). Each console service also ships a binary of its own
(`authup-auth-console`, `authup-admin-console`, `authup-account-console`) for a
deployment that runs a console without the CLI; `authup console` is the
supported route.

**Known limitation.** Under a sub-path deployment (`PUBLIC_URL` carrying a path
behind a prefix-stripping proxy), `authup start` mounts the consoles at a path
the listener never sees, so console pages answer `404`
([#3531](https://github.com/authup/authup/issues/3531)). The API is unaffected.
Deploy at the origin root, or serve the consoles from their own replica set.

### A console derives its own configuration, and refuses a foreign origin

Every value a console service used to be handed by the CLI is now computed
from the document by the console itself: the issuer (`publicUrl`, derived from
`core.host` and `core.port` when the document names none), the
canonicalized `trustedOrigins`, its own url, and every path resolved against
`rootPath`. One `authup.yml` therefore means the same thing whether a console
is started by `authup start`, by `authup console`, or by its own
`authup-<name>-console` binary.

**Action required** for a deployment that starts a console through its own
binary AND publishes it on a domain other than `publicUrl`'s. That
configuration used to boot and half-work; it now refuses to start, with the
key and both urls named. It was already refused when the console was started
through the CLI, so only the standalone binary changes behaviour. A console
under a PATH of its own is unaffected and remains fully supported.

**No action** otherwise. Two things stop being errors: a console started
standalone without `PUBLIC_URL` now derives one instead of refusing to start,
and a scheme-less `trustedOrigins` entry (`hub.local`) now expands to both its
http and its https origin for the console as well, where it previously
expanded only for server-core. If you added a redundant explicit origin to
work around that, it stays harmless.

### The consoles moved under `/console`

Every console `server-core` serves now lives under one `/console` prefix on
the IdP origin:

| Surface | Was | Is |
|---|---|---|
| Admin console | `<publicUrl>/admin` (unreleased, see the next entry) | `<publicUrl>/console/admin` |
| Account console | `<publicUrl>/account` | `<publicUrl>/console/account` |
| Auth console assets (the scripts and styles behind `/authorize`, `/logout`, `/register`, ...) | `<publicUrl>/public/` | `<publicUrl>/console/auth/assets/` |

The auth page URLs (`/authorize`, `/logout`, `/register`, `/activate`,
`/password-forgot`, `/password-reset`) and every API route are unchanged.
They are the protocol surface (`authorization_endpoint`,
`end_session_endpoint`, the mail deep links) and stay at the root; a `GET` on
one of them now redirects to the auth console at `/console/auth`, which
renders it (see the next entries). `/console` itself serves nothing.

**Action required.**

- **Rebuild and redeploy every console together with the server.** The base
  path is baked into each bundle's `index.html`, and the server mounts the
  assets under the new path only. A `@authup/client-admin-console` or
  `@authup/client-account-console` dist built for the old base is served
  without any error and renders a blank console: the shell keeps its old
  `src="/admin/assets/..."` hrefs, which nothing answers any more. The
  published packages and the Docker image of this release carry matching
  bundles; a package you substitute (`ADMIN_CONSOLE_PATH`,
  `ACCOUNT_CONSOLE_PATH`, `AUTH_CONSOLE_PATH`) has to be rebuilt with the new
  vite base (`/console/admin/`, `/console/account/`, `/console/auth/`).
- **Links, bookmarks and proxy rules** naming `/account`, `/admin` or
  `/public` must name the new paths. That includes the sign-in routes
  (`/console/account/login/start`, `/console/account/callback` and the admin
  pair) and every page below a console (`/console/account/authenticators`,
  ...). Update the "Manage account" link your own applications render.
- **No redirect is served for the old paths.** `/account/**`, `/admin/**` and
  `/public/**` answer `404`.
- **`@authup/client-web-kit` and the server must be on the same release.** The
  kit's `buildConsoleLoginURL` now emits
  `<baseURL>/console/<console>/login/start`, a path of its own: the bare
  `/console/<console>/login` is the console's own login PAGE, served by the
  console service.
  A newer kit against an older server kicks to a route that does not exist,
  and an older kit (or an older standalone-hosted console bundle) against
  this server does the same the other way round; a `404` on a top-level
  navigation is unrecoverable.
- **Standalone hosting**: the default `basePath` a console assumes is now
  `/console/admin` and `/console/account`. A host may serve the bundle under
  any other base by injecting `basePath` (see [Admin
  Console](./configuration-client-admin-console.md#standalone-hosting) and
  [Account Console](./account-console.md#standalone-hosting)); the
  same-origin API derivation strips the full two-segment default.

One prefix is what makes serving the consoles from their own replica set a
single proxy rule; see [Console Replicas](./console-replicas.md).

Also in this release, `ACCOUNT_CONSOLE_ENABLED=false` applies to the account
console's sign-in routes as well: `GET /console/account/login/start` and
`GET /console/account/callback` answer `404` instead of starting a login, the
way the admin console's routes did already. Before, a disabled account console
still minted a pending login and a session cookie on a direct hit. No action
needed.

### The admin console is no longer a Nuxt server

The admin console is a static single-page bundle, served at
`<publicUrl>/console/admin` the way the account console is served at
`<publicUrl>/console/account` (the `/console` prefix is the entry above). A
default deployment still runs one container: `authup start` runs the API and
every console on one listener (see the next entry for what serves what).

**Action required.**

- **Docker / Compose**: remove the `client/admin-console` service. The
  entrypoint no longer starts it: `client/admin-console start` prints the
  replacement and exits `1`, so a stale service fails loudly instead of
  reporting a healthy run having started nothing. The remaining `server/core`
  container serves the console.
- **Helm**: the chart in the `authup/helm` repository still deploys an admin
  console workload, whose pods now crash-loop for the reason above. Remove or
  scale that workload to zero. A follow-up chart release drops it.
- **Bare metal**: the command does not change. `authup start` starts
  `server/core` alone. `authup start client.admin-console` is refused and a
  `client.admin-console` section of the configuration file is not read (see the entry
  above). Remove both.
- **`TRUSTED_ORIGINS`**: drop the console's former origin. It serves nothing
  now, but the provisioner keeps re-asserting every listed origin into the
  system clients' redirect allowlists on each boot.
- **Reverse proxy**: collapse the two upstreams into one. Under `authup start`
  the API and every console are served by the same listener, so a rule that
  routed `/` to the console port and `/api/` to the server port routes `/` to
  the server port now. See [Nginx](./nginx).
- **Links and bookmarks**: the console moved from the root of its own origin
  to `<publicUrl>/console/admin`.

**Retired environment variables**, none with a successor:
`NUXT_PUBLIC_API_URL`, `NUXT_PUBLIC_PUBLIC_URL`, `NUXT_PUBLIC_COOKIE_DOMAIN`,
`NUXT_PUBLIC_CLIENT_ID`, `NUXT_HOST`, `NUXT_PORT`, and the console's
build-time names `API_URL`, `API_URL_SERVER`, `PUBLIC_URL`, `COOKIE_DOMAIN`
and `CLIENT_ID`. The cookie domain is moot: the console is same-origin with
the API, so there is nothing to widen. Note that `PUBLIC_URL` is unaffected as
a [`server/core` option](./configuration-server-core); it is the server's own
public URL, and the console's address derives from it.

**New options.** `ADMIN_CONSOLE_ENABLED` / `adminConsole.enabled`
(default `true`) serves the console; with it off nothing mounts it and the
API's two sign-in routes answer `404`. `ADMIN_CONSOLE_PATH` /
`adminConsole.path` substitutes the console package, the same contract
as `ACCOUNT_CONSOLE_PATH`: a directory holding a built `dist/` whose
`index.html` carries the `<!--admin-config-->` marker. `enabled` is read by
both server-core and the console service; `path` only by the console service.
The `features` block of the public status endpoint (`GET /`) gains
`adminConsole`.

**Deliberately gone**: the `authup-admin-console` binary and the published
Nuxt server bundle. `@authup/client-admin-console` ships `dist/` only. The
bundle stays hostable on a static host of your own, on its own origin; see
[Admin Console](./configuration-client-admin-console.md#standalone-hosting).

Sign-in changed as well and needs no action. Served from the API's origin, the
console authenticates with the same opaque `HttpOnly` session cookie the
account console uses (`GET /console/admin/login/start` and
`GET /console/admin/callback` against the per-realm `admin-console` client), so
no OAuth2 token reaches the browser's JavaScript. Hosted standalone on a
foreign origin it keeps the browser-side authorization-code flow with PKCE.

### Token introspection requires authorization

`POST /token/introspect` (and its `GET` form) now answers `401` to a request
carrying no credentials, as RFC 7662 section 2.1 requires ("the endpoint MUST
also require some form of authorization"). Two forms are accepted:

- a **live bearer**: `Authorization: Bearer <access token>`. The token may be
  the one being introspected (what `@authup/client-web-kit` sends) or the
  caller's own, for instance a resource server's client-credentials token
  (what the `@authup/server-adapter-*` packages send, minted on the first
  `401` and replayed);
- **confidential client credentials**: `client_id` + `client_secret` in the
  form body or as `Authorization: Basic`, or a `tls` client's certificate. A
  public client (`authMethod: none`) is refused with `invalid_client`; its
  bare `client_id` identifies it but proves nothing.

Authentication is the first layer. The second is WHOSE tokens the caller
may introspect: the caller's own (the subject matches), tokens issued for
the caller's own client (the token's `client_id`), or any token reached by
the new `token_introspect` permission (realm-scoped: an `admin` reaches
everything, a default grant covers the client's own realm). A caller
failing all three receives a bare `{"active": false}`, as RFC 7662
section 2.2 prescribes for a resource "not allowed to introspect". The
server logs the denial, since the response is indistinguishable from a
dead token by design.

**Action required for resource servers** using `@authup/server-adapter-*`
remote verification: grant `token_introspect` to the client behind the
verifier's `creator`, or foreign tokens will verify as inactive. A
downstream application introspecting tokens issued to its own client needs
no grant.

The expired-token report (next section) is gated the same way: it is
reachable only by a caller that proved who it is and may introspect that
token. An expired token is NOT a credential: the authorization middleware
rejects an expired bearer before the endpoint runs, so a request whose
only token is the lapsed one answers `401`.

**Action required** for an integration that called the endpoint anonymously:
send one of the two credentials. Nothing changes for `@authup/client-web-kit`
(it introspects its own token). For the `@authup/server-adapter-*` packages
the credential replay flow is preserved, but verifying foreign tokens now
additionally requires the `token_introspect` grant described above.
`POST /token/revoke` stays open as a deliberate
authup choice: RFC 7009 asks a public client to identify itself by
`client_id` and the server to verify token ownership, but a public
`client_id` proves nothing, and possession of the token already lets its
holder use it. Revoking is the benign action.

### Introspecting an expired token now returns its payload

`POST /token/introspect` answers `200` with `"active": false` **and the token's
payload and subject claims** for an expired token, where it previously raised
`401`. A relying party can now tell the person whose session ended who they
were - "your session expired, Alice" - instead of only that something failed.

A token the server cannot read at all - malformed, a bad signature, a `kid`
naming no known key - is also reported now, as a bare `{"active": false}`. It
answered `401` (or `404`) before. RFC 7662 section 2.2 requires this: a token
that "does not exist on this server" is reported, not raised. A missing `token`
**parameter** is still a malformed request and still answers `400`.

**`permissions` is no longer returned for an inactive token**, expired ones
included. It names who the token belonged to, not what they were allowed to do.
A caller that read `permissions` off an introspection response must check
`active` first - which it should have been doing regardless.

### Token revocation answers 200, and answers it for invalid tokens too

`POST /token/revoke` returned `202`. It now returns **`200`**, the status RFC
7009 section 2.2 names. Both are 2xx, so a client checking the status class is
unaffected; a client comparing against `202` exactly is not.

The same `200` is now returned for a malformed or unverifiable token, per the
same section - "invalid tokens do not cause an error response since the client
cannot handle such an error in a reasonable way". Expired tokens already
behaved this way. The point of the rule is that an invalid token is
indistinguishable from a revoked one, so do not expect to detect a bad token
from the response.

**Action required if you branch on the failure.** A client that treated a `401`
from introspection as "the token is dead" now has to read `active`, which is the
field RFC 7662 defines for it.

`@authup/client-web-kit` is updated in step: its store refuses to commit a
session for a response reporting `active: false`, which it previously ignored -
so a revoked or expired token restored from cookies rendered as authenticated
until the next protected request failed. Upgrade the kit alongside the server.

### A bearer token whose key is unknown answers 401, not 404

An access token whose `kid` names no key, an encryption key, or a disabled key
was reported as `404 jwk_not_found` on every route. It is now `401` with the
`invalid_token` code, which is what a resource server expects from a credential
it cannot verify. The practical effect is that clients recover from a key
rotation instead of treating it as a missing resource.

### 401 responses from protected routes carry `WWW-Authenticate`

Per RFC 6750 section 3, a `401` from a protected resource now carries
`WWW-Authenticate: Bearer error="invalid_token", error_description="..."`, or a
bare `Bearer` when the request presented no credentials at all. The token
endpoint's own `401` (`invalid_client`, RFC 6749 section 5.2) deliberately does
not carry the header, since it is not a bearer failure. Purely additive.

### Identity provider updates keep attributes they do not mention

`POST /identity-providers/:id` replaced the provider's whole extra-attribute
set, so an update that said nothing about a key deleted it. Automation written
before `requiredAmr` / `requiredAcr` existed therefore turned the upstream
assurance gate off just by updating an OAuth2 provider. A partial update now
keeps attributes it never mentioned. Send an attribute as `null` to clear it.
Changing a provider's `protocol` still replaces the set, so the old protocol's
configuration (including its secret) does not linger.

### The identity provider assurance gate checks the id_token audience

With `requiredAmr` or `requiredAcr` set, the upstream `id_token` must now carry
the provider's `clientId` as its **only** audience, and an `azp`, if present,
must name it too. OIDC Core section 3.1.3.7 item 3 rejects a token listing any
audience the client does not trust, and authup has no trusted-audience setting,
so the client's own id is the only trusted one.

Providers with neither allow-list set are unaffected, and a conformant OIDC
provider issuing a token for one relying party satisfies this already. An
upstream that mints one id_token for several audiences at once will start
failing logins when you opt into assurance.

### Docker: the writable directory moved to `/var/lib/authup`

The image wrote its runtime files to `/usr/src/app/writable`, inside the
application install directory. It now uses `/var/lib/authup`, which is where
the filesystem hierarchy standard puts mutable application state and which is
a cleaner mount point than a path nested in the install tree.

**Action required if you mount a volume at the old path.** Update the mount
target; the volume itself is unchanged.

```diff
 volumes:
-  - authup:/usr/src/app/writable
+  - authup:/var/lib/authup
```

The same applies to a bind-mounted provisioning directory:
`-v /path/to/provisioning:/var/lib/authup/provisioning`.

Miss this and nothing fails loudly: the container starts, writes its
production log files inside the container layer instead of the volume, and
finds no provisioning files, so file-based provisioning silently stops being
applied. Set `WRITABLE_DIRECTORY_PATH=/usr/src/app/writable` to keep the old
location instead.

Only the image default changed. Running outside Docker still defaults to
`writable` relative to the application root, so an unprivileged `npx` or
bare-metal start is unaffected.

### A relative `writableDirectoryPath` now resolves against `rootPath`

The documented behavior - a relative path is resolved against `rootPath` -
was implemented for `themeDirectoryPath`, `authConsolePath` and
`accountConsolePath` but not for `writableDirectoryPath`, which stayed
relative to the process working directory and ignored `rootPath` entirely.
It now resolves like its siblings.

This only changes behavior for a deployment that sets `rootPath` to something
other than the working directory **and** gives `writableDirectoryPath` a
relative value. Absolute values, and the default, are unaffected.

### `GET /identity-providers/:id` now requires authentication

The endpoint was anonymous. It now requires an identity holding one of
`IDENTITY_PROVIDER_READ`, `IDENTITY_PROVIDER_UPDATE` or
`IDENTITY_PROVIDER_DELETE` for that provider's realm. A request without a
token answers `401`; an authenticated caller lacking the permission answers
`403` with code `permission_evaluation_failed`.

The record read carries the provider's extra attributes, which for an OAuth2
provider include `clientSecret` and for an LDAP provider the bind password.
The previous behavior handed those to anyone who knew a provider id.

**Action required only if you read a single provider without a token.** The
collection stays anonymous, because the hosted login page lists providers
before anyone signs in, and it never carries the extra attributes. Read the
one provider from it instead:

```http
GET /identity-providers?filter[id]=<provider-id>
GET /identity-providers?filter[name]=<provider-name>
```

Both key forms the record route accepted are filterable, so a caller
addressing a provider by name has a substitute too.

## v1.0.0-beta.62

### `auth_identity_provider_accounts` gains a unique constraint

`(provider_id, provider_user_id)` becomes unique, so one external identity
belongs to exactly one local user. Until now that invariant was enforced only
by a read-then-write in the application, with no transaction and no row lock,
so two concurrent logins or link completions for the same upstream subject
could both insert. After that the subject resolved to whichever row the
database happened to order first.

**Action required only if your deployment already holds such duplicates.**
The migration checks first and aborts the boot with the number of affected
groups rather than a hash-named driver error. Find them with:

```sql
SELECT provider_id, provider_user_id, COUNT(*)
FROM auth_identity_provider_accounts
GROUP BY provider_id, provider_user_id
HAVING COUNT(*) > 1;
```

Keep the row whose `user_id` names the account the person actually uses, and
delete the rest. The unique index cannot be created while duplicates exist,
so the boot would fail either way; the check only makes the reason readable.

### Federated login: completion hardening

- A federated login must carry the authorization code request it completes.
  `GET /identity-providers/:id/authorize-out` refuses a request without
  `codeRequest` (`invalid_request`). SDK consumers building their own login
  page pass it through the client:
  `client.identityProvider.getAuthorizeUri(id, { codeRequest })`; the bare
  `getAuthorizeUri(id)` URL no longer starts a login on its own.
- The callback completes the request by redirecting the browser to the
  client's own `redirect_uri` with `code` and `state` (RFC 6749). A refusal
  after the callback lands on the hosted login page instead of a JSON body,
  and a provider answering with `error` (the user cancelled) does the same.
- A custom-scheme `redirect_uri` (`myapp://cb`, RFC 8252) is served through
  an interstitial page that launches the app. Script-capable and local
  schemes (`javascript:`, `data:`, `vbscript:`, `blob:`, `filesystem:`,
  `file:`, `about:`) are refused everywhere: as a client redirect pattern, at
  `/authorize`, and at the callback.
- A `redirectUri` / `postLogoutRedirectUri` pattern carrying userinfo
  (`https://user:pass@app/**`) is refused by the client validator, as is a
  `redirect_uri` carrying one at `/authorize` and `/logout`. An existing
  client row holding such a pattern cannot be saved again until the pattern
  is fixed, and a provisioning file declaring one fails the boot with the
  file path and the issue.
- The pending-login state a federated login or an account link carries
  moved to its own cache namespace, so a login or link started on the
  previous version and completed after the upgrade is refused
  (`invalid_request`, up to the 30 minute state lifetime); the person starts
  it again. Relevant for a rolling upgrade over a shared Redis only.
- The identity-provider form's read-only "Redirect URL" now shows the
  callback (`/identity-providers/<id>/authorize-in`), the value to register
  at the external provider. It used to show `authorize-out`, which is the
  URL that starts a login, not the one the provider redirects back to.
- A substituted auth console package (`AUTH_CONSOLE_PATH`) must be built
  against render contract version 2, which adds the interstitial route
  `/identity-providers/:id/authorize-in` and its `IdentityProviderCallbackPayload`;
  a package exporting an older `CONTRACT_VERSION` is refused at boot.

## v1.0.0-beta.60

### Fixed: external identity-provider login

The token exchange against an external OAuth2 / OIDC provider never sent the
`code` parameter, so **every federated login has failed since
v1.0.0-beta.28** with an `invalid_request` from the provider's token
endpoint. The callback passed the raw code string where the authenticator
expected `{ code }`, and the HTTP client spread it into indexed body keys
(`0=d&1=b&...`). **No action is required** beyond upgrading. A callback that
arrives without a code is now rejected with a `400` instead of an opaque
upstream failure.

### `auth_sessions.client_id` is the client-subject foreign key only

One browser session legitimately serves several applications (the hosted auth
pages and the account console share the IdP origin by design), so a single
column could never name all of them: it was last-writer-wins and accurate for
none. Per-application attribution moved one level down, onto
`auth_session_tokens.client_id`.

`auth_sessions.client_id` now means what its foreign key always implied — the
subject of a **client** session — and is `NULL` for a user's session. Nothing
writes the authorizing application there anymore.

- **Runbooks that sign an identity out of one application must change**:
  `DELETE /sessions?filter[clientId]=...` no longer matches user sessions.
  Use `DELETE /session-tokens?filter[clientId]=...`, which revokes that
  application's tokens and leaves the session alive so the others stay signed
  in. To sign an identity out everywhere, filter by `userId` instead.
- **Sessions created before the upgrade keep the old value.** No backfill
  ships, because the column is behind `ON DELETE CASCADE`: until those rows
  expire (session lifetime, three days by default), deleting a retired client
  still force-logs-out the users whose sessions recorded it. Either wait out
  the lifetime before deleting a client, or run
  `UPDATE auth_sessions SET client_id = NULL WHERE sub_kind <> 'client'`.

### Schema migration: constraint names, MySQL column widths, 140 indexes

Two migrations apply. Both are safe to run on a populated database, and the
round trip is verified in CI against MySQL and PostgreSQL, but the second one
is not instant on a large instance. **Run `authup migration run` before the
rolling restart** rather than letting the first pod apply it under traffic.

- Index, unique and foreign-key names move onto the values TypeORM derives
  from the entity metadata. Names have no runtime meaning; this only ends a
  split where two naming regimes coexisted and every generated migration
  emitted 32 renames before its actual change.
- **MySQL only**: 15 `uuid` columns widen from `varchar(36)` to the
  `varchar(255)` TypeORM derives for them. This rewrites those tables, blocks
  writes for the duration and needs disk headroom for the copy. It runs first
  and is re-runnable, so an interrupted upgrade retries cleanly.
- 140 indexes are added, backing the filter and sort vocabulary each entity
  advertises (see below) and the remaining foreign-key columns. On PostgreSQL
  the migrations run in one transaction, so the largest tables
  (`auth_events`, `auth_sessions`, `auth_session_tokens`) are locked for the
  duration of the build.
- Three orphaned tables are **dropped with their rows**:
  `auth_authorization_codes`, `auth_refresh_tokens` and
  `auth_identity_provider_roles`. Each was superseded years ago (codes moved
  to cache blobs, refresh tokens to `auth_session_tokens`, provider roles to
  `auth_identity_provider_role_mappings`) and no entity has described them
  since. Back them up first if you still read them out of band.

### API: `meta.schema.sort` is now `meta.schema.sorts`

The query-capable `GET` endpoints describe their vocabulary under
`meta.schema`. Its sort key was renamed `sort` → `sorts` (rapiq 2.1.0, which
made `sorts` canonical on every developer-authored surface). **A client that
reads `meta.schema.sort` must follow**; there is no alias. The `?sort=-name`
URL parameter is unchanged.

Filters and sorts are also index-anchored now: every key an endpoint allows
is backed by a real index, so single-key filters and sorts behave exactly as
before. The one narrowing is a **multi-key sort** with no matching composite
index prefix, which is now dropped whole rather than executed — the request
still succeeds, unsorted.

## v1.0.0-beta.59

### Security fix: redirect patterns with a host wildcard

A `redirectUri` / `postLogoutRedirectUri` pattern carrying a `*` in its host
(`https://*.example.com/**`) matched more than its host. The matcher treats
`/` as its only boundary, while a URL authority also ends at `?`, `#` and
`\`, so `https://evil.test?.example.com/cb` matched the pattern above and an
authorization code was issued to `evil.test`.

The candidate is now canonicalized before matching, so the string that gets
authorized is the string the browser navigates to. **No action is required**,
and no legitimate redirect stops matching. Three side effects are worth
knowing:

1. Both the request and the stored pattern are normalized before comparison,
   so a host differing only in case, an explicit default port (`:443` on
   https) and `.`/`..` segments resolve on either side. A path-scoped pattern
   can no longer be walked out of with `..`, and a pattern that was written
   non-canonically (`https://APP.example.com/**`, `https://app.example.com:443/**`)
   now matches the requests it always looked like it should.
2. `**` is no longer accepted inside the host of a pattern. It matches the
   rest of the value outright, so `https://**.example.com/**` read as "any
   subdomain" but accepted every origin. A single `*` is unchanged: it matches
   any run of characters that does not cross a `/`, so it spans dots and
   `https://*.example.com/**` covers `https://a.b.example.com/cb` as well as
   `https://a.example.com/cb`. A stored pattern is not rewritten; only new
   writes are rejected.
3. `TRUSTED_ORIGINS` rejects the same shape at startup, with a message naming
   the offending value.

### `client/web` was renamed to `client/admin-console`

The rename of the admin console app (`@authup/client-web` →
`@authup/client-admin-console`) reaches the operator surface. There is **no
backwards alias**, and an unknown selector is now a hard error instead of a
silent success:

- **Docker**: `docker run authup/authup client/web start` →
  `client/admin-console start`. The entrypoint used to exit `0` on an unknown
  service, so this previously looked like a healthy container that started
  nothing. It now exits `1`.
- **Launcher config**: a `client.web` section in `authup.conf` is no longer
  read. Rename it to `client.admin-console`, otherwise every key in it
  (`port`, `host`, `apiUrl`, `cookieDomain`) silently falls back to its
  default.
- **CLI**: `authup start client/web` → `authup start client/admin-console`.
- **Binary**: `authup-ui` → `authup-admin-console`.

### `admin-console` and `account-console` are reserved client names

Both names are now provisioned as system clients in every realm. If a client
of either name already exists, **it is taken over** rather than left alone:
the provisioner overwrites `name`, `realmId`, `authMethod`,
`tokenBindingMethod`, `builtIn`, `active`, `grantTypes`, `scope`,
`redirectUri` and `postLogoutRedirectUri`, which makes it a public
(secret-less) auto-consenting client.

Rename any existing client on those names **before** upgrading. Attributes
outside that list (`displayName`, `description`, `accessPolicyId`, junction
rows) are preserved.

### The per-realm `web` client was removed

The shared `web` system client is no longer provisioned. Authup's own
consoles were moved off it earlier (`admin-console` / `account-console`);
it existed purely for downstream applications and was default-on attack
surface (auto-consent + `global` scope in every realm).

**Existing `web` rows are not touched**: logins against them keep working.
Two behavior changes require action:

1. `PUBLIC_URL` / `TRUSTED_ORIGINS` changes no longer propagate to the
   leftover rows; their `redirectUri` / `postLogoutRedirectUri` are
   frozen as-is.
2. Realms created after the upgrade get no `web` client, so a
   `client_id=web` login breaks there.

Register a client of your own instead. To keep the every-realm semantics,
declare it once via a [wildcard realm entry](./provisioning.md#realm-wildcard-name)
(`realms[].attributes.name: "*"`), which also offers a declarative `absent` cleanup for
the leftover `web` rows. `CLIENT_WEB_NAME` was removed from
`@authup/core-kit`, and `web` is a regular, creatable client name again.

## v1.0.0-beta.52 (was: next release after v1.0.0-beta.51)

### Login redirect allowlist — set `TRUSTED_ORIGINS`

Interactive login runs through the authorization-code flow against a per-realm `web` client
whose redirect allowlist is built from the origin of `PUBLIC_URL` plus every entry in
`TRUSTED_ORIGINS` (renamed from `ADDITIONAL_DOMAINS`).

**If your web UI is served from a different origin than `PUBLIC_URL`** (e.g. UI on
`https://app.example.com`, server on `https://auth.example.com`) **you must set**:

```dotenv
TRUSTED_ORIGINS=app.example.com
```

Otherwise every login fails after the redirect with an opaque OAuth2 error. Entries may be
bare hosts (expanded to both `http` and `https`) or full origins; comma-separated.

::: warning Security
Each trusted origin is added to a `builtIn` (auto-consent) client carrying the `global`
scope — an allowlisted origin can obtain full-permission user tokens. Only list origins you
control.
:::

### Refresh-token rotation (hard cutover)

Every `refresh_token` grant now rotates: the presented token is retired and a fresh pair is
issued. Refresh tokens minted **before** the upgrade are rejected with `invalid_grant` —
active users have to sign in once after the upgrade. Replaying an already-consumed refresh
token revokes the whole session family (RFC 6819 §5.2.2.3). A multi-tab tolerance window can
be configured via `TOKEN_REFRESH_GRACE_PERIOD` (seconds, default `0` = strict).

### Access-token TTL default lowered: 3600 → 900 seconds

Shrinks the revocation blind spot for stateless JWKS-verifying adapters. Override via
`TOKEN_ACCESS_MAX_AGE` (seconds) if your deployment depends on longer-lived access tokens.

### Authorize & token flows are realm-bound

An identity can only authorize (or redeem a code / refresh a token) against a client in
**its own realm** — a cross-realm attempt yields `login_required` / `invalid_grant`.
Consequences:

- Master-realm admins can no longer sign into other realms' applications through the
  built-in `web` client; use an identity of the target realm.
- A client identified **by name** at `/authorize` now requires a realm hint
  (`realm_id`), since every realm has a `web` client.

### Implicit & hybrid response types removed

`response_type=code` is the only supported response type (OAuth 2.1 posture). Public clients
must use PKCE and `state` unconditionally; the `id_token` is minted at the `/token` exchange.
RPs still using `token` / `id_token` / hybrid response types must migrate to the code flow.

### RP-initiated logout & discovery corrections

- New `end_session_endpoint`: `GET/POST /logout` (advertised in the realm discovery
  document). Downstream apps should end the shared authup session by redirecting there with
  an `id_token_hint`.
- `post_logout_redirect_uri` is honored only when it matches the client's **new, separate**
  `post_logout_redirect_uri` column — a URI matching only the login `redirect_uri` is
  rejected. Set the column for clients that use post-logout redirects (the provisioned
  `web` client is populated automatically).
- Discovery `revocation_endpoint` was corrected from `…/token` to `…/token/revoke`
  (RFC 7009).

### Minimum password length raised to 10

New password writes (user create/update, registration, password reset) reject values shorter
than 10 characters — configurable via `PASSWORD_MIN_LENGTH`. Existing password hashes keep
verifying; nobody is forced to reset. File-provisioned users whose configured password is
shorter than the floor now fail provisioning validation at startup.

### `Client.grantTypes` is now enforced

A non-null `grantTypes` value (space- or comma-delimited) acts as an allowlist at the
`/token` grants and the `/authorize` code request; violations fail with
`unauthorized_client`. `null` keeps allow-all semantics, so only clients that *set* the
column are affected — review clients that stored decorative values (e.g. a client listing
only `authorization_code` will fail token refreshes until `refresh_token` is added). The
provisioned per-realm `web` client already lists `authorization_code refresh_token`.

### Also notable (no action required)

- **Session management**: `GET/DELETE /sessions` API plus a sessions UI ("This device"
  marker, "log out other devices", admin force-logout).
- **OIDC prompt surface**: `/authorize` supports `prompt` (`none|login|consent|select_account`),
  `max_age` and `login_hint`; the `@authup/client-web-kit` URL builder now defaults to
  `prompt=select_account`, so kit-based apps inherit an account chooser on lingering
  sessions (pass an explicit `prompt` to opt out).
- **id_token claims**: `auth_time` now reflects the real authentication instant and a `sid`
  (session id) claim is included.
