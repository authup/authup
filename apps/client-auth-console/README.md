# @authup/client-auth-console

The auth console: authup's SSR auth workflow UI. It renders the hosted pages
on the IdP origin — `/authorize` (login + consent), `/register`, `/activate`,
`/password-forgot`, `/password-reset` and `/logout`.

This package is not a standalone application. `@authup/server-core` depends on
it, renders each request through the built server bundle
(`dist/server/server.js`) with a per-request hydration payload, and serves the
client assets (`dist/client/`). The auth pages are architecturally inseparable
from the IdP origin (WebAuthn origin binding, first-party session cookies,
same-path GET-HTML/POST-JSON routes), so there is nothing meaningful to host
without server-core.

The supported boundary between server-core and this package is the render
contract in `src/contract.ts` (`render(RenderContext) => RenderResult`).
Operators who want a custom login/consent UI can substitute this package with
one that fulfills the same contract instead of forking server-core.

## Documentation

To find out how to use Authup, visit the [documentation](https://authup.org).

## License

Distributed under the AGPL-3.0-only license (with a commercial license
available). See the `LICENSE` file and the repository's `LICENSING.md` for
details.
