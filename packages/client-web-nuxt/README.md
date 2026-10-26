<p align="center">
    <img src="https://raw.githubusercontent.com/authup/authup/master/.github/assets/logo.svg" alt="Authup logo" width="96" height="96" />
</p>

<h1 align="center">@authup/client-web-nuxt</h1>

<p align="center">
    <b>Nuxt module that signs your app in with Authup and guards its routes by login state and permission.</b><br>
    It installs @authup/client-web-kit with Nuxt's cookies, SSR payload and runtime config wired in.
</p>

<p align="center">
    <a href="https://www.npmjs.com/package/@authup/client-web-nuxt"><img src="https://img.shields.io/npm/v/@authup/client-web-nuxt" alt="npm version" /></a>
    <a href="https://github.com/authup/authup/actions/workflows/main.yml"><img src="https://github.com/authup/authup/actions/workflows/main.yml/badge.svg" alt="CI" /></a>
    <a href="./LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0-blue" alt="License: Apache-2.0" /></a>
</p>

<p align="center">
    <a href="#installation"><b>Installation</b></a> · <a href="#usage">Usage</a> · <a href="#options">Options</a> · <a href="https://authup.org">Documentation</a>
</p>

---

## Why @authup/client-web-nuxt?

[`@authup/client-web-kit`](https://github.com/authup/authup/tree/master/packages/client-web-kit) is a plain Vue plugin. In a Nuxt app it has to read the session from cookies during the server render, hand what it loaded on the server to the browser, know a different API address on each side, and check every navigation. This module does that wiring once.

| Concern | Without it | With it |
|---|---|---|
| **Session cookies** | Bridge the kit's cookie functions to `useCookie` on both sides | Wired, including `Secure` from the request's scheme and an optional name prefix |
| **API address** | Pass one URL that has to work from the browser and from the server | `apiURL` for the browser, `serverApiURL` for the server, kept out of the page |
| **Route guards** | Write a middleware that resolves the session and checks every route | A global middleware reading `requireLoggedIn`, `requireLoggedOut` and `requirePermissions` page meta |
| **Login callback** | Redeem `?code=` yourself and strip it from the URL | The middleware exchanges it against the saved PKCE request and lands on the `redirect` path |
| **Server rendering** | Lists fetched on the server and again on hydration | The kit's hydration handoff rides `nuxtApp.payload.data` |

## Installation

```shell
npm install @authup/client-web-nuxt @pinia/nuxt pinia
```

`@pinia/nuxt` and `pinia` are peer dependencies (the module registers `@pinia/nuxt` itself). Install the kit's own peers too, the Vue, `vue-router`, `ilingo`, `validup` and `@vuecs/*` packages listed in [its README](https://github.com/authup/authup/tree/master/packages/client-web-kit#installation), plus a theme ([`@authup/client-web-kit-theme`](https://github.com/authup/authup/tree/master/packages/client-web-kit-theme) or [`@authup/client-web-theme`](https://github.com/authup/authup/tree/master/packages/client-web-theme)). The module is built for Nuxt 4, is ESM-only and needs Node.js `^22.13.0 || ^23.5.0 || >=24.0.0`.

## Usage

### Register the module

```typescript
export default defineNuxtConfig({
    modules: ['@authup/client-web-nuxt'],
    authup: {
        apiURL: 'https://auth.example.com',
        serverApiURL: 'http://authup:3000',
    },
    css: ['@authup/client-web-theme/index.css'],
});
```

Every option except `serverApiURL` lands in the public `runtimeConfig.public.authup`, so `NUXT_PUBLIC_AUTHUP_API_URL` overrides `apiURL` at runtime. `serverApiURL` goes to the private `runtimeConfig.authup` and is overridden with `NUXT_AUTHUP_SERVER_API_URL`. It only changes where the server render sends its requests: every URL the kit's client derives from the API URL (identity provider links, the OAuth2 endpoints) keeps the public one, since hydration does not correct a rendered `href`. A `buildAuthorizeURL` call takes its base from you, so pass it the public `apiURL`.

### Install vuecs after the kit

The module installs the kit, not vuecs. Add a plugin that runs after it:

```typescript
import vuecs from '@vuecs/core';
import installForms from '@vuecs/forms';
import clientWebKitTheme from '@authup/client-web-kit-theme';
import clientWebTheme from '@authup/client-web-theme';
import { buildVuecsInstallOptions } from '@authup/client-web-kit';

export default defineNuxtPlugin({
    name: 'vuecs',
    dependsOn: ['authup:kit'],
    setup(nuxtApp) {
        const options = nuxtApp.vueApp.runWithContext(() => buildVuecsInstallOptions({
            themes: [clientWebKitTheme(), clientWebTheme()],
        }));

        nuxtApp.vueApp.use(vuecs, options);
        nuxtApp.vueApp.use(installForms);
    },
});
```

Use `dependsOn: ['authup:kit']`, not `enforce: 'pre'`: the kit provides the translator `buildVuecsInstallOptions()` reads, and running before it fails the whole plugin chain.

### Guard a page

```vue
<script lang="ts">
import { PermissionName } from '@authup/core-kit';
import { defineComponent } from 'vue';
import { RouteMetaKey } from '#authup/nuxt';

definePageMeta({
    [RouteMetaKey.REQUIRE_LOGGED_IN]: true,
    [RouteMetaKey.REQUIRE_PERMISSIONS]: [PermissionName.USER_READ],
});

export default defineComponent({
    setup() {
        return {};
    },
});
</script>
```

The global `authup` middleware runs on every navigation:

1. A `?code=` in the URL is exchanged on the client against the saved authorization request, then the user lands on the `redirect` query (site-relative paths only) or on the same route without the OAuth2 parameters.
2. Otherwise it awaits `store.resolve()`. On failure it signs out and sends the user to `loginRoute` with `redirect` set to the page they asked for.
3. `requireLoggedIn` (on the route or any parent) sends a signed-out user to `loginRoute`.
4. `requireLoggedOut` signs out a signed-in user and lets the navigation continue.
5. `requirePermissions` (a name, a `{ name, realmId?, clientId? }` object for a realm- or client-owned permission, or a list of either; any one of them passes) sends a denied user back to the page they came from, home after a fresh login, or to `loginRoute` when they were denied the page they are on.

The `authup:session-expiry` plugin also sends the user to `loginRoute` when a background refresh fails on a page that requires login.

### Read the session

```typescript
import { StoreAuthStatus, injectStore } from '@authup/client-web-kit';

const store = injectStore();
const signedIn = store.status === StoreAuthStatus.AUTHENTICATED;
```

Everything else (permission checks, the login form, the authorization code helpers) comes from `@authup/client-web-kit`; see its README.

## Options

Set under the `authup` key of `nuxt.config`:

| Option | Type | Default | Description |
|---|---|---|---|
| `apiURL` | `string` | `http://localhost:3001` | API URL for the browser, and for the server when nothing more specific is set. |
| `serverApiURL` | `string` | `apiURL` | Address the server render dials. URLs the kit renders keep the public API URL. Private runtime config only. |
| `apiURLRuntimeKey` | `string` | none | Path into the runtime config to read the API URL from: the whole runtime config on the server, the public one in the browser. `serverApiURL` still wins on the server. |
| `cookieDomain` | `string` | host only | `Domain` attribute of the session cookies. `127.0.0.1` is written as `localhost`. |
| `cookieDomainRuntimeKey` | `string` | none | Path into the public runtime config to read the cookie domain from. |
| `cookiePrefix` | `string` | none | Prepended verbatim to every session cookie name (`flame_` writes `flame_access_token`). Use letters, digits, `_`, `-` and `.` only. |
| `homeRoute` | `string` | `/` | Where a user lands after a fresh login whose target they may not open. |
| `loginRoute` | `string` | `/login` | Where the middleware sends signed-out and expired users. |

## API

| Export | Kind | Purpose |
|---|---|---|
| default | Nuxt module | Registers `@pinia/nuxt`, the plugins `authup:kit`, `authup:session-expiry` and `authup`, and the global `authup` route middleware |
| `ModuleOptions` | type | The `authup` options |
| `RouteMetaKey` (from `#authup/nuxt`) | enum | `requireLoggedIn`, `requireLoggedOut`, `requirePermissions` |
| `authup:middleware:start`, `authup:middleware:redirect`, `authup:middleware:end` | runtime hooks | Called by the middleware with `{ to, from }` |

## Notes

- **The module brings no login page.** Build `loginRoute` yourself, for example with the kit's `ALoginForm`, or start the authorization code flow from it.
- **Keep the callback route client-only.** The PKCE verifier lives in `sessionStorage`, so the middleware skips the code exchange during the server render; a `routeRules` entry with `ssr: false` for the callback page avoids rendering it on the server at all.
- **`cookiePrefix` is a contract across your services.** A resource server of yours that reads the access token from the cookie must read the prefixed name.
- **The account preferences sync only in the browser.** The plugin hands the kit `useCookie` refs for `vc-locale` and `vc-color-mode`, written with the cookie options of `@vuecs/nuxt` when present, so the account's language and color mode reach your switchers and back.
- **This module does not enable the kit's `cookieSession` mode**; a Nuxt app keeps the token pair in its own cookies.

## License

Made with 💚

Published under the [Apache 2.0 License](./LICENSE).
