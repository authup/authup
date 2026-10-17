<p align="center">
    <img src="https://raw.githubusercontent.com/authup/authup/master/.github/assets/logo.svg" alt="Authup logo" width="96" height="96" />
</p>

<h1 align="center">@authup/client-auth-console</h1>

<p align="center">
    <b>Authup's hosted login, consent, registration, password recovery and device pages, as a server-rendered Vue bundle.</b><br>
    Rendered by @authup/server-auth-console; replace it with your own package to reskin the pages.
</p>

<p align="center">
    <a href="https://www.npmjs.com/package/@authup/client-auth-console"><img src="https://img.shields.io/npm/v/@authup/client-auth-console" alt="npm version" /></a>
    <a href="https://github.com/authup/authup/actions/workflows/main.yml"><img src="https://github.com/authup/authup/actions/workflows/main.yml/badge.svg" alt="CI" /></a>
    <a href="./LICENSE"><img src="https://img.shields.io/badge/license-AGPL--3.0-blue" alt="License: AGPL-3.0" /></a>
</p>

<p align="center">
    <a href="#installation"><b>Installation</b></a> · <a href="#usage">Usage</a> · <a href="#render-contract">Render contract</a> · <a href="https://authup.org">Documentation</a>
</p>

---

## Where it fits

The package renders the pages a person sees while signing in: `/authorize` (login, second factor, consent), `/register`, `/activate`, `/password-forgot`, `/password-reset`, `/device` (device verification) and `/logout`. It ships a built `dist/` plus the type file of its render contract, and no process. [`@authup/server-auth-console`](https://github.com/authup/authup/tree/master/apps/server-auth-console) depends on it, renders each request through `dist/server/server.js` with a per-request hydration payload, and serves `dist/client/assets`.

These pages cannot be hosted on their own: passkeys are bound to the identity provider's origin, the session cookies they read are first-party there, and every page has a `POST` twin on the same path of the API. Install this package directly only to build a replacement against its types.

## Installation

```shell
npm install @authup/client-auth-console
```

Its one runtime dependency, `@authup/core-http-kit`, is there because the render contract's types reference the HTTP client.

## Usage

### Reskin the pages

Theming (colors, logo, favicon, a stylesheet) needs no new package: mount a theme directory and set `THEME_DIRECTORY_PATH`. To change the markup, publish a package that fulfills the render contract below and point the service at its directory:

```shell
AUTH_CONSOLE_PATH=/opt/my-auth-pages authup start
```

The directory needs:

| File | Purpose |
|---|---|
| `dist/client/index.html` | The page template, with `<!--app-html-->` for the rendered markup and `<!--preload-links-->` in the head |
| `dist/client/.vite/ssr-manifest.json` | The module-to-asset map the render uses for preload links |
| `dist/client/assets/` | The client assets, served under the service's `/assets` |
| `dist/server/server.js` | An ES module exporting `render` and `CONTRACT_VERSION` |

The service checks `CONTRACT_VERSION` at boot and refuses any value other than the one it was built for.

## Render contract

```typescript
import type { RenderContext, RenderFunction, RenderResult } from '@authup/client-auth-console';

export const CONTRACT_VERSION = 5;

export const render: RenderFunction = async (ctx: RenderContext): Promise<RenderResult> => {
    const html = await renderPage(ctx.url, ctx.payload);

    return [html, ''];
};
```

| Type | Fields |
|---|---|
| `RenderContext` | `url` (the page path), `manifest` (the SSR manifest), `payload` (`HydrationPayload`), `httpClient?` (a client to use instead of one built from `payload.config.baseURL`), `cookies?` (the visitor's access token cookie, on `/authorize` only) |
| `HydrationPayload` | `config.baseURL` (the API URL the browser reaches), `data` (the page's own data), `hydration?` (results produced during the render, for the client to adopt) |
| `RenderResult` | `[html, preloadLinks]` |

The render puts `payload` into its own output for the client half to hydrate from; the built-in one appends it as `window.__AUTHUP__`. The service splices the two strings of `RenderResult` into the template's markers.

| `CONTRACT_VERSION` | Added |
|---|---|
| `1` | The contract (also what a bundle without the export counts as) |
| `2` | The federated callback's interstitial route and payload |
| `3` | `federatedLogin` on `/authorize`: the page completes a login that returned from an external provider |
| `4` | The `/device` page |
| `5` | `federatedLogin` on `/device` |

## Development

There is no `dev` script here. `npm run dev` at the repository root detects this package as a source checkout and serves it through a Vite dev server with hot module replacement, in front of the auth console service on `http://localhost:3000`. Edits to this package and to `@authup/client-web-kit` show up on the next request.

```shell
npm run build    # dist/client and dist/server, what the service renders
```

## Notes

- **The version only rises.** A replacement built for an older version is refused at boot, so bump it together with the service.
- **Never forward the refresh token.** `cookies` carries the access token alone; a render cannot hand a rotated token pair back to the browser.
- **`httpClient` is per render.** It carries the visitor's bearer once the session resolves, so a host builds one per request and never shares it.

## License

Made with 💚

Published under the [AGPL-3.0](./LICENSE). A commercial license is available; see [LICENSING.md](https://github.com/authup/authup/blob/master/LICENSING.md).
