> v1.0.0-beta.68 adds control over identity-provider enrollment, session-aware hosted authorization pages, and worker health reporting. These notes cover the changes since v1.0.0-beta.67.

## 👀 Highlights

### 🧩 Migrate to the current Vue kit session API

`@authup/client-web-kit` removes its deprecated session setters, dispatcher events and component aliases. Read `status` and `lastAuthOrigin` for session state, and apply tokens through the login or token-grant methods.

```diff
+ import { StoreAuthStatus } from '@authup/client-web-kit';

- const authenticated = store.loggedIn;
+ const authenticated = store.status === StoreAuthStatus.AUTHENTICATED;

- store.setAccessToken(response.access_token);
- store.setRefreshToken(response.refresh_token);
+ store.applyTokenGrantResponse(response);
```

`status` reflects the presence of the token, realm and user. Use `await store.resolve()` when restoring and validating a session.

> [!WARNING]
> There is no compatibility layer. Update direct consumers of the kit before upgrading. The heads-up table below lists the other removals.

📖 [Session API](https://authup.org/sdks/javascript/client-web-kit/session) · [Removed kit APIs](https://authup.org/guide/deployment/upgrading#removed-kit-apis)

### 🩺 Monitor the background worker

`authup start worker` now serves a health report at `GET /` and `HEAD /`. It reports each scheduled component's last successful pass and whether it is overdue, so a process that remains alive while its sweeps fail becomes visible to monitoring.

For Kubernetes, use a readiness probe:

```yaml
readinessProbe:
    httpGet:
        path: /
        port: 3000
    periodSeconds: 30
```

The response becomes `503` after a component goes five minutes without a successful pass, including the initial startup allowance. A running pass has up to 30 minutes before it counts as overdue. The worker still runs no database migrations.

> [!WARNING]
> The listener defaults to `PORT`. If the worker shares a host with another Authup role, give it a separate `WORKER_PORT`. The image healthcheck and `authup healthcheck` probe `PORT`, so leave `WORKER_PORT` unset in containers relying on those checks. Use this endpoint for readiness: a database outage should not trigger a liveness restart loop.

📖 [Worker health](https://authup.org/guide/deployment/worker#health)

### 🔐 Decide who can enroll through an identity provider

OAuth2, OpenID Connect and LDAP providers now expose **Allow new users** and **New-user policy**. Disable enrollment to admit only already linked accounts, or evaluate an `attributes` policy against the mapped user before creating it. Existing linked accounts continue to sign in, and signed-in owners can still connect an account.

For example, select an attributes policy with this query to require a company email address:

```json
{ "email": { "$endsWith": "@company.com" } }
```

Enrollment remains enabled by default. A denied or unloadable enrollment policy refuses creation without leaving a user or provider folder behind.

Mappers now read merged claims from the access token, ID token and userinfo response, in that precedence order. This makes claims such as Google's `email_verified` available to attribute, role and permission mappings even when they are absent from the access token.

> [!NOTE]
> A domain check alone does not verify an email address. To require verification, map `email_verified` to `emailVerified` and add `"emailVerified": true` to the policy as described in the guide. A role or permission granted solely by a userinfo claim is removed on a login whose userinfo request fails.

📖 [Identity-provider enrollment](https://authup.org/guide/user/identity-providers#who-may-get-an-account)

### 👤 Hosted authorization pages recognize an existing session

A signed-in visitor to `/authorize` now receives the appropriate account, MFA or consent step in the initial server-rendered page. The browser adopts the MFA and consent results instead of fetching them again, avoiding the initial login-form flash and duplicate challenges. Invalid authorization requests also include their error in the initial HTML.

The render forwards only the access-token cookie; it does not refresh or revoke the browser's tokens. Other hosted pages keep their existing initial steps.

> [!NOTE]
> Split deployments make these server-side API calls from the auth console's address. High traffic can exhaust that address's rate-limit bucket; review `core.middlewareRateLimit.max` if requests start receiving `429`. The composed `authup start` uses exempt loopback calls.

📖 [Hosted login pages](https://authup.org/guide/deployment/hosted-login) · [Session rendering details](https://github.com/authup/authup/pull/3662)

### 🌍 Find built-in permissions, policies and scopes by their labels

The admin console shows built-in names in English, German, French and Spanish, and collection search matches the translated labels. Your explicit `displayName` takes precedence. Default entity pickers also show display names and retain the underlying identifier when it differs.

For example, the built-in `client_create` permission appears as **Create clients** in English and **Clients erstellen** in German. Your own permission with the same identifier keeps its own name. This change covers the admin lists, detail headings and default pickers; consent and device pages still use raw names.

📖 [Localized names and search](https://github.com/authup/authup/pull/3661)

### 📝 String attributes retain their type

Newly written string attributes no longer turn into numbers or booleans when read back. This applies to user, role, policy and identity-provider attributes, and to the underlying `@authup/kit` serialization helpers.

```typescript
import { deserialize, serialize } from '@authup/kit';

deserialize(serialize('123'));  // '123'
deserialize(serialize('true')); // 'true'
```

Existing values are not rewritten. A numeric-looking string stored by an older release keeps its old interpretation until you write it again. Code that reads serialized storage directly now sees JSON-quoted strings.

📖 [Attribute storage compatibility](https://authup.org/guide/deployment/upgrading#attribute-values-keep-their-type)

### ⚠️ Heads-Up Before Upgrading

| Change | What to do |
| --- | --- |
| Deprecated store getters and setters removed | Replace `loggedIn` with `status`; replace `setAccessToken`, `setRefreshToken`, `setAccessTokenExpireDate` and `setIdToken` with the login, authorization-code exchange or token-grant methods. Remove `setRealm` and `setCookiesRead` calls. |
| Legacy dispatcher events removed | Replace `LOGGING_IN`, `LOGGED_IN`, `LOGGING_OUT`, `LOGGED_OUT`, `RESOLVING`, `RESOLVED` and `REALM_UPDATED` listeners with `status`, `lastAuthOrigin` and `await store.resolve()` as appropriate. |
| Component and icon aliases removed | Replace `ALogin` with `ALoginForm`, and `LanguageSwitcherDropdown` with `ALanguageSwitcherDropdown`. Replace `registerIconCollections()` with your app's build-time icon scan or `addCollection()` from `@iconify/vue`; declare the icon dependencies your app uses directly. |
| `CookieName.USER` removed from `@authup/core-http-kit` | Remove references. The kit no longer reads or writes the `realm` cookie, or removes an old `user` session cookie; that cookie expires when the browser closes. |
| Worker opens a health port | Set `WORKER_PORT` when sharing a host with another role. In plain Compose, remove the worker's disabled-healthcheck override to enable monitoring. Keep restart-on-unhealthy behavior disabled when database failures would cause a restart loop. |
| Custom policy options require validation | Register a validator through `PolicyServiceContext.validators` if you embed custom policy types. A type without a validator now rejects supplied options with HTTP 400; only declared options are stored. |
| Provider updates can clear omitted settings | Send the complete provider when updating it, including enrollment settings and required-claim lists. Omitting these fields can remove the restrictions. |
| String serialization changes | Rewrite existing attributes if you need to recover their intended string type. Update direct storage readers to handle JSON-quoted strings. |

### ⬆️ Upgrading

For an installation using the operator CLI:

```sh
npm install authup@1.0.0-beta.68 --save-exact
```

Update the `@authup/*` SDK packages your application consumes to the same release. The Node.js requirement remains `^22.13.0 || ^23.5.0 || >=24.0.0`.

📖 [Upgrade guide](https://authup.org/guide/deployment/upgrading)

## 👉 Changelog

[Compare v1.0.0-beta.67...v1.0.0-beta.68](https://github.com/authup/authup/compare/v1.0.0-beta.67...v1.0.0-beta.68)

### ⚠ BREAKING CHANGES

* **client-web-kit:** `loggedIn`, `setAccessToken`, `setRefreshToken`, `setAccessTokenExpireDate`, `setIdToken`, `setRealm`, `setCookiesRead`, the LOGGING_IN/LOGGED_IN/LOGGING_OUT/LOGGED_OUT/RESOLVING/RESOLVED and REALM_UPDATED dispatcher events, `ALogin`, `LanguageSwitcherDropdown`, `registerIconCollections()` and `CookieName.USER` are removed. See the "Removed kit APIs" upgrading note for the replacements.

### Features

* **client-web-kit:** remove deprecated store API ([#3666](https://github.com/authup/authup/issues/3666)) ([50b27a0](https://github.com/authup/authup/commit/50b27a00c85cf83d6206e9fe4d1dae1f547957b1))
* identity-provider enrollment gating ([#3675](https://github.com/authup/authup/issues/3675)) ([8ce62e2](https://github.com/authup/authup/commit/8ce62e2f66bff7cd1c3992d50aeefb65e21a2cbd))
* localized built-in names, shared console config, admin page harness, provisioning backfill batch ([#3661](https://github.com/authup/authup/issues/3661)) ([34d963f](https://github.com/authup/authup/commit/34d963f12c65c51dabee8316fc5c80ee1c0f3570))
* **server-auth-console:** render the visitor's session on /authorize ([#3662](https://github.com/authup/authup/issues/3662)) ([0f7f50a](https://github.com/authup/authup/commit/0f7f50a55e03baeb9019627aa48cc15cd2987e7a))
* **server-core:** health endpoint for the worker role ([#3682](https://github.com/authup/authup/issues/3682)) ([e0f3462](https://github.com/authup/authup/commit/e0f3462731d5b49027bb7b37f06fd722505e9be4))


### Bug Fixes

* **authup:** inline dev stylesheets; ship a default console favicon ([#3677](https://github.com/authup/authup/issues/3677)) ([929b008](https://github.com/authup/authup/commit/929b008b33699aafcbfe0cb0f27e3ced794349ca))
* ensure consistent version for release ([45e6080](https://github.com/authup/authup/commit/45e6080bacdf9bc65874a0b65e420dd22bf1a5fd))
* **kit:** keep the type of a serialized string ([#3673](https://github.com/authup/authup/issues/3673)) ([e4fc61a](https://github.com/authup/authup/commit/e4fc61a73c37bc237545e49103cca378beaaa34c)), closes [#3671](https://github.com/authup/authup/issues/3671)
* **server-core:** feed identity-provider mappers the merged claims ([#3680](https://github.com/authup/authup/issues/3680)) ([688f87f](https://github.com/authup/authup/commit/688f87fda40a3cc98852f63faf883ff69f9607c2)), closes [#3674](https://github.com/authup/authup/issues/3674)
* **server-core:** harden the extra-attribute writer ([#3672](https://github.com/authup/authup/issues/3672)) ([4a200c2](https://github.com/authup/authup/commit/4a200c25011ec931b025a17c45a10028e193a443)), closes [#3670](https://github.com/authup/authup/issues/3670)

### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/errors bumped from ^1.0.0-beta.67 to ^1.0.0-beta.68
    * @authup/kit bumped from ^1.0.0-beta.67 to ^1.0.0-beta.68
