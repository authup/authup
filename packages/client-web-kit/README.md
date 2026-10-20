<p align="center">
    <img src="https://raw.githubusercontent.com/authup/authup/master/.github/assets/logo.svg" alt="Authup logo" width="96" height="96" />
</p>

<h1 align="center">@authup/client-web-kit</h1>

<p align="center">
    <b>Vue 3 components, a Pinia session store and permission checks for apps that sign in with Authup.</b><br>
    The login form, the authorize flow, token refresh and the admin entity screens, written once for every Authup client.
</p>

<p align="center">
    <a href="https://www.npmjs.com/package/@authup/client-web-kit"><img src="https://img.shields.io/npm/v/@authup/client-web-kit" alt="npm version" /></a>
    <a href="https://github.com/authup/authup/actions/workflows/main.yml"><img src="https://github.com/authup/authup/actions/workflows/main.yml/badge.svg" alt="CI" /></a>
    <a href="./LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0-blue" alt="License: Apache-2.0" /></a>
</p>

<p align="center">
    <a href="#installation"><b>Installation</b></a> · <a href="#usage">Usage</a> · <a href="#api">API</a> · <a href="https://authup.org">Documentation</a>
</p>

---

## Why @authup/client-web-kit?

A Vue app that signs in at Authup needs the same client half every time: a session that survives a reload, a token that renews itself, a guard that knows what the signed-in user may do, and forms for the entities Authup manages. Authup's own admin, account and auth consoles are built from this package, and so can your app be.

| Concern | Without it | With it |
|---|---|---|
| **Session** | Store tokens yourself, decide when they are stale, refresh them before they expire | A Pinia store with `login()`, `resolve()`, `logout()` and a `status` ref; the HTTP client renews the access token on a 401 and retries |
| **Sign-in** | Build the PKCE pair, the `/authorize` URL and the code exchange | `createPKCE()`, `buildAuthorizeURL()`, `saveAuthorizationRequest()` and `store.exchangeAuthorizationCode()` |
| **Permissions** | Hand-written role checks in templates | `usePermissionCheck({ name })`, a fail-closed `Ref<boolean>` answered by the server's verdicts for the signed-in user |
| **Screens** | Forms and lists for users, roles, clients, policies, sessions | `A*` components for every entity, plus the login, MFA, register, password and device workflow forms |
| **Server rendering** | Lists fetched on the server, then fetched again on hydration | An optional `hydrationStore` hands server-rendered rows and verdicts to the browser |

## Installation

```shell
npm install @authup/client-web-kit
```

The package is ESM-only and needs Node.js `^22.13.0 || ^23.5.0 || >=24.0.0` for builds and server rendering.

The consumer installs the singletons the kit shares with the app (a second copy would split them):

```shell
npm install vue vue-router pinia ilingo @ilingo/vue @ilingo/validup-vue validup @validup/vue socket.io-client \
    @vuecs/core @vuecs/design @vuecs/button @vuecs/elements @vuecs/forms @vuecs/icon @vuecs/link \
    @vuecs/list @vuecs/overlays @vuecs/pagination @vuecs/tree
```

`@vuecs/locale` is an optional peer: the language switcher uses it when installed and falls back to the kit's own locale otherwise.

The components ship no CSS of their own. Their styles live in [`@authup/client-web-kit-theme`](https://github.com/authup/authup/tree/master/packages/client-web-kit-theme), and Authup's full look in [`@authup/client-web-theme`](https://github.com/authup/authup/tree/master/packages/client-web-theme). For Nuxt, use [`@authup/client-web-nuxt`](https://github.com/authup/authup/tree/master/packages/client-web-nuxt), which installs the kit for you.

## Usage

### Install the plugin

```typescript
import { createPinia } from 'pinia';
import { createApp } from 'vue';
import vuecs from '@vuecs/core';
import installForms from '@vuecs/forms';
import installPagination from '@vuecs/pagination';
import clientWebKitTheme from '@authup/client-web-kit-theme';
import clientWebTheme from '@authup/client-web-theme';
import { buildVuecsInstallOptions, install } from '@authup/client-web-kit';
import App from './App.vue';

const app = createApp(App);
const pinia = createPinia();
app.use(pinia);

install(app, {
    baseURL: 'https://auth.example.com',
    pinia,
});

const vuecsOptions = app.runWithContext(() => buildVuecsInstallOptions({
    themes: [clientWebKitTheme(), clientWebTheme()],
}));

app.use(vuecs, vuecsOptions);
app.use(installForms);
app.use(installPagination);

app.mount('#app');
```

- **Install the kit before vuecs.** `install()` provides the translator, and `buildVuecsInstallOptions()` reads it to translate the submit-button labels, so it has to run inside `app.runWithContext()` after the kit.
- **Install `@vuecs/forms` and `@vuecs/pagination` yourself, after `app.use(vuecs, ...)`.** The kit deliberately does not install them, so they pick up your themes.
- `install()` provides the store, the HTTP client (with the token-renewal hook), the translator and the `@validup/vue` defaults (a blank optional field is submitted as `null`). Entity components are only registered globally when you pass `components: true` or a list of names.

### Read and drive the session

```typescript
import { StoreAuthStatus, injectStore } from '@authup/client-web-kit';

const store = injectStore(pinia);

await store.login({ name: 'admin', password: 'start123', realmId: 'master' });

if (store.status === StoreAuthStatus.AUTHENTICATED) {
    console.log(store.user?.name, store.realmName);
}

await store.resolve();
await store.logout();
```

- `status` is derived from what the store holds: `unauthenticated` (nothing), `authenticating` (a login or code exchange in flight), `restoring` (an artifact without a complete session, for example a refresh token alone) and `authenticated` (token, realm and user present).
- **`restoring` is not a spinner state.** Nothing restores a session until some caller runs `resolve()`, which either completes it (refreshing if needed) or clears it. Await `resolve()` in your router guard.
- `lastAuthOrigin` says how the current session started in this app instance: `login`, `exchange` or `restore`.
- `store.user` is built from the token introspection and holds `id`, `name`, `displayName` and `email`. Load the full record yourself when you need more.
- `logout()` revokes the token pair, and in cookie mode also ends the server-side session. Pass `{ revoke: false }` when the teardown reacts to a failure rather than to a sign-out, so a transient error does not destroy a session that is still good.

### Gate UI on a permission

```typescript
import { PermissionName } from '@authup/core-kit';
import { usePermissionCheck } from '@authup/client-web-kit';
import { defineComponent, h } from 'vue';

export default defineComponent({
    setup() {
        const canUpdate = usePermissionCheck({ name: PermissionName.USER_UPDATE });

        return () => h('button', { disabled: !canUpdate.value }, 'Edit');
    },
});
```

The ref reads `false` until the evaluation settles and re-evaluates when the session or its verdicts change. Call it once in `setup()`, and pass a getter instead of an object to make the context reactive. `usePermissionCheckState()` adds a `settled` ref for callers that must tell "denied" from "not decided yet". The verdicts come from `POST /authorization/check`; the check is advisory, since the server enforces every decision again.

### Sign in with the authorization code flow

```typescript
import {
    buildAuthorizeURL,
    clearAuthorizationRequest,
    createPKCE,
    createState,
    injectStore,
    loadAuthorizationRequest,
    saveAuthorizationRequest,
} from '@authup/client-web-kit';

export async function startLogin() {
    const pkce = await createPKCE();
    const state = createState();
    const redirectUri = `${window.location.origin}/login/callback`;

    saveAuthorizationRequest({
        state,
        code_verifier: pkce.code_verifier,
        redirect_uri: redirectUri,
        client_id: 'my-app',
        realm_id: 'master',
    });

    window.location.href = buildAuthorizeURL({
        baseURL: 'https://auth.example.com',
        clientId: 'my-app',
        realmId: 'master',
        redirectUri,
        state,
        codeChallenge: pkce.code_challenge,
        codeChallengeMethod: pkce.code_challenge_method,
    });
}

export async function handleCallback(code: string, state: string) {
    const request = loadAuthorizationRequest();
    clearAuthorizationRequest();

    if (!request || request.state !== state) {
        throw new Error('Unexpected authorization response.');
    }

    await injectStore(pinia).exchangeAuthorizationCode(code, {
        code_verifier: request.code_verifier,
        redirect_uri: request.redirect_uri,
        client_id: request.client_id,
        realm_id: request.realm_id,
    });
}
```

- `buildAuthorizeURL()` defaults `scope` to `global openid` and `prompt` to `select_account`, so a lingering session offers "continue as / use another account". Pass `prompt: ''` to send none.
- It also sends `ui_locales` and `ui_color_mode` from the `vc-locale` and `vc-color-mode` cookies, so the hosted pages open in the language and color mode your app uses. Pass `''` to opt out.
- **Replay `redirect_uri` from the saved request.** The token endpoint compares it byte for byte, and by the time the browser is back `window.location` carries `code` and `state`. To return to a page after login, put it into the callback's own query (`/login/callback?redirect=%2Fusers`).
- `buildEndSessionURL()` builds the RP-initiated logout URL; `store.idToken` is the `id_token_hint` it takes.

### Render a workflow form

```typescript
import { ALoginForm } from '@authup/client-web-kit';
import { defineComponent, h } from 'vue';

export default defineComponent({
    setup() {
        return () => h(ALoginForm, {
            onDone: () => { window.location.assign('/'); },
        });
    },
});
```

`ALoginForm` renders a realm picker, the password form, the second-factor step when the account has an authenticator, and the realm's identity providers when it is given a `codeRequest`. It emits `done` once the store holds the session and `failed` with the error. The other workflow components are `AAuthorize`, `AMfaChallengeForm`, `ARegisterForm`, `AActivateForm`, `APasswordForgotForm`, `APasswordResetForm`, `ADeviceVerifyForm` and `AEndSessionForm`.

### Sync the account's language and color mode

```typescript
import {
    COLOR_MODE_COOKIE,
    COLOR_MODE_UNSET,
    LOCALE_COOKIE,
    LOCALE_UNSET,
    createCookieRef,
    install,
} from '@authup/client-web-kit';

install(app, {
    baseURL: 'https://auth.example.com',
    pinia,
    preferences: {
        locale: createCookieRef(LOCALE_COOKIE, undefined, LOCALE_UNSET),
        colorMode: createCookieRef(COLOR_MODE_COOKIE, undefined, COLOR_MODE_UNSET),
    },
});
```

Pass the refs your app already reads its locale and color mode from. On every session commit the store seeds them from the account's `locale` and `color_mode` claims; when the account holds nothing it writes an explicit browser value up once; a change to a ref is written back to the user's attribute after a short debounce. `createCookieRef()` returns one ref per cookie name, so every component reading the same cookie sees the same value.

### Hand server-rendered data to the browser

```typescript
install(app, {
    baseURL: 'https://auth.example.com',
    pinia,
    isServer: true,
    hydrationStore: {
        get: <T>(key: string) => payload[key] as T | undefined,
        set: (key, value) => { payload[key] = value; },
        delete: (key) => { delete payload[key]; },
    },
});
```

`payload` is your framework's per-request hydration payload. With a store, collection components load inside `onServerPrefetch` and record their rows, and permission verdicts are recorded too; the hydrating client adopts them instead of fetching again. **Without a store the kit performs no server-side loads at all.** Back it with a fresh object per request: the keys carry no user, so a store shared between requests would serve one user's rows to another.

## Options

The second argument of `install(app, options)`:

| Option | Type | Default | Description |
|---|---|---|---|
| `baseURL` | `string` | (required) | URL of the Authup API. |
| `httpClient` | `IClient \| (() => IClient)` | `new Client({ baseURL })` | The client for each kit consumer: the store, the provided client and the renewal hook's refresh and revoke. A function is called once per consumer; an instance is shared by all of them. Prefer a function returning a NEW client per call: with one instance the renewal hook refreshes on the client it is attached to, which waits on itself when `/token` answers 401. A server render uses a function to keep the base url public while dialing an internal address (`createRebasedTransport`). |
| `pinia` | `Pinia` | the active Pinia | Pinia instance the store is registered on. |
| `isServer` | `boolean` | `false` | Set during a server render; disables the background refresh timer. |
| `components` | `boolean \| string[]` | not registered | Register every entity component globally, or the named ones. |
| `translatorLocale` | `string` | `en` | Initial locale of the built-in translations (`en`, `de`, `fr`, `es`). |
| `cookieGet` / `cookieSet` / `cookieUnset` | functions | `universal-cookie` | Cookie access for the persisted tokens and `realm_management`; pass your framework's when it owns cookies (Nuxt `useCookie`). |
| `cookiePath` | `string` | `/` | Path the store cookies are written with. Every Authup surface on one origin must pass the same value. |
| `cookieSecure` | `boolean` | whether the document is https | Mark the store cookies `Secure`. A server render cannot tell, so pass the request's scheme there. |
| `cookieSession` | `boolean` | `false` | Authenticate on the server's `HttpOnly` session cookie instead of a token pair. Only works on the API's own origin. |
| `preferences` | `{ locale?: Ref<string>, colorMode?: Ref<string> }` | none | Refs synced with the account's UI preferences. |
| `hydrationStore` | `HydrationStore` | none | Bucket for the server-to-client handoff. |
| `realtime` / `realtimeURL` | `boolean` / `string` | off / `baseURL` | Install the socket manager. |

## API

| Export | Kind | Purpose |
|---|---|---|
| `install`, default export | function, plugin | Installs store, HTTP client, translator and validation defaults |
| `injectStore`, `storeToRefs`, `StoreAuthStatus`, `StoreAuthOrigin` | functions, enums | The session store and its states |
| `injectHTTPClient` | function | The provided `@authup/core-http-kit` client |
| `injectStoreDispatcher`, `StoreDispatcherEventName` | function, enum | Store events, such as `SESSION_EXPIRED` after a failed background refresh |
| `usePermissionCheck`, `usePermissionCheckState` | composables | Reactive permission verdicts |
| `createPKCE`, `createState`, `buildAuthorizeURL`, `buildEndSessionURL`, `buildConsoleLoginURL` | functions | OAuth2 and OIDC URLs |
| `saveAuthorizationRequest`, `loadAuthorizationRequest`, `clearAuthorizationRequest` | functions | The pending authorization request in `sessionStorage` |
| `createCookieRef`, `createColorMode`, `LOCALE_COOKIE`, `COLOR_MODE_COOKIE` | functions, constants | Cookie-backed preference refs |
| `buildVuecsInstallOptions` | function | Icon preset and translated defaults for `app.use(vuecs, ...)` |
| `useTranslation`, `useTranslator`, `useErrorTranslator`, `syncTranslatorLocaleFromManager` | composables, function | Translations from `@authup/i18n`, following `@vuecs/locale` |
| `AUsers`, `AUser`, `AUserForm`, `ARoles`, `AClients`, `APolicies`, `ASessions`, ... | components | List, record and form components for every Authup entity |
| `ALoginForm`, `AAuthorize`, `AMfaChallengeForm`, `ARegisterForm`, `ADeviceVerifyForm`, ... | components | The hosted workflow forms |
| `AAuthApp`, `AAuthShell`, `AAccountShell`, `ALanguageSwitcherDropdown`, `AColorModeSwitcher`, `APagination`, `ASearch` | components | Shells and utilities |
| `Options`, `HydrationStore`, `StorePreferences`, `StoreLogoutOptions` | types | Option shapes |

The full component reference is at [authup.org](https://authup.org).

## Notes

- **Cookie mode is for the API's own origin only.** The session cookie is `SameSite=Strict` and the server also demands `Sec-Fetch-Site: same-origin`, so `cookieSession: true` against an API on another origin signs nobody in. In that mode the store neither reads nor writes the token cookies.
- **The persisted cookies are the tokens and `realm_management`.** The user record is derived from the introspection on every `resolve()`, never stored in a cookie.
- **A session is committed only for a token the server reports `active`.** A revoked or expired access token falls through to a refresh instead of being committed as a live session.
- **The theme is not optional.** Without `@authup/client-web-kit-theme`'s CSS the components render unstyled class strings.

## License

Made with 💚

Published under the [Apache 2.0 License](./LICENSE).
