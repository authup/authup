# Theming

Authup serves three consoles from the identity provider origin: the **auth
console** (the login, consent, registration, activation, password and logout
pages), the **admin console** at `/console/admin` and the **account console** at
`/console/account`. All three can be rebranded from a directory you mount into the
container. No image build, no rebuild of authup.

::: warning Experimental
Theming is experimental and may change in a minor release. Per-realm themes
are the planned next step, and they are likely to reshape the directory into
`<theme root>/<theme name>/`, which would move every file below one level.
The manifest carries a `version` field so a breaking change is detectable
rather than silent, and this page will carry the migration.

Concretely, treat as unstable: the directory layout, the manifest field names,
and the `theme*` configuration keys. Treat as stable: the `--authup-*` token
names (they are the theme packages' own published tokens) and the trust
boundary below.

Pin an authup patch version if you cannot absorb a change, and say so on the
tracking issue if you are running this in production. Real usage is what
promotes it to stable.
:::

## What you can and cannot change

The consoles are compiled Vue bundles, so there is no request-time template
engine. That draws a hard line through what theming can do.

| | Reachable |
|---|---|
| Colours, surfaces, borders | yes |
| Spacing, radii, font sizes, font family | yes |
| Logo, favicon, background imagery | yes |
| Document title | yes |
| Extra `<head>` content (fonts, meta tags, scripts) | yes, opt-in |
| Markup, field order, which controls exist | no |
| UI copy and translations | no |
| Icons | no |

If you need markup, you are replacing the console rather than theming it. See
[Replacing a console](#replacing-a-console) at the end of this page.

::: warning Trust boundary
The theme directory is as sensitive as `authup.yml`. Its stylesheet is loaded
on the origin that holds your users' session cookies and renders the OAuth2
consent screen, so arbitrary CSS there can restyle or cover the Allow and Deny
buttons. Mount it read-only and never from a source a tenant or a
lower-privileged CI job can write to.

In Kubernetes this matters more than in Docker: a namespace-scoped role
granting `configmaps` write is often held by a wider set of principals than the
Deployment itself.
:::

## Enabling it

Point `themeDirectoryPath` (`THEME_DIRECTORY_PATH`) at the directory. Empty is
the default and disables theming entirely.

```bash
docker run \
  -e THEME_DIRECTORY_PATH=/etc/authup/theme \
  -v /srv/authup/theme:/etc/authup/theme:ro \
  authup/authup
```

In Kubernetes, mount the whole volume. A `subPath` projection is frozen until
the pod restarts and would destroy the live reload described below.

```yaml
env:
  - name: THEME_DIRECTORY_PATH
    value: /etc/authup/theme
volumeMounts:
  - name: authup-theme
    mountPath: /etc/authup/theme
    readOnly: true
volumes:
  - name: authup-theme
    configMap:
      name: authup-theme
```

Every file below is text, so one ConfigMap holds the lot. Binary assets go in
its `binaryData`.

## Recipe: your first theme

Five minutes from zero to a rebranded login page.

**1. Make the directory.**

```bash
mkdir -p ~/authup-theme/assets
```

**2. Start with colours only.** Put this in `~/authup-theme/theme.json`. One
token does most of the work: `--authup-periwinkle` is the accent the whole
primary palette is mixed from, so it recolours the submit button, focus rings,
links and the login backdrop at once.

```json
{
  "version": 1,
  "title": "Sign in to ACME",
  "tokens": {
    "--authup-periwinkle": "#c0392b"
  }
}
```

**3. Run it.**

```bash
docker run --rm -p 3001:3001 \
  -e THEME_DIRECTORY_PATH=/etc/authup/theme \
  -v ~/authup-theme:/etc/authup/theme:ro \
  authup/authup
```

The quickest check is `http://localhost:3001/logout`. It is served by the
same console and carries the same theme, and it takes no parameters.

To see the accent on the login form itself, open the hosted login page. Note
that `/authorize` rejects an incomplete request by rendering an error card
(with a `200`, so the page still loads), and every parameter below is
required:

```text
http://localhost:3001/authorize?response_type=code&client_id=admin-console&realm_id=master&scope=openid&state=devstate&code_challenge=devchallenge&redirect_uri=http%3A%2F%2Flocalhost%3A3001%2F
```

The submit button should be red. `realm_id` is needed because a client
identified by name is only unique per realm and every realm carries the
same-named system clients; `state` (at least 5 characters) and
`code_challenge` are required because `admin-console` is a public client; and
`redirect_uri` has to match one of its registered patterns, which are derived
from `PUBLIC_URL` and `TRUSTED_ORIGINS`.

Check the startup log if the colour does not appear: authup prints the
resolved theme directory, whether the manifest loaded, and every file it will
serve.

**4. Add the surfaces.** Colours split into an accent (above) and the surface
ramp everything else derives from. Add to `tokens`, and mirror the
colour-dependent ones under `tokensDark`:

```json
{
  "tokens": {
    "--authup-periwinkle": "#c0392b",
    "--authup-surface-app": "#f5f3f0",
    "--authup-surface-card": "#ffffff",
    "--authup-surface-border": "#e2ded8",
    "--authup-on-surface": "#1c1a19",
    "--authup-on-surface-muted": "#6b6560"
  },
  "tokensDark": {
    "--authup-surface-app": "#141312",
    "--authup-surface-card": "#201e1d",
    "--authup-surface-border": "#332f2c",
    "--authup-on-surface": "#efece8",
    "--authup-on-surface-muted": "#a49c95"
  }
}
```

Toggle the colour-mode switch in the top-right to check both. Edits apply on
the next page load, no restart.

**5. Add your logo and favicon.** Drop `logo.svg` and `favicon.svg` into
`assets/` and reference them. Square artwork works best; the logo is painted
into the existing mark's box, so it needs no sizing.

```json
{
  "favicon": "assets/favicon.svg",
  "logo": "assets/logo.svg"
}
```

If your mark is dark-on-light it will vanish against the dark card, so add a
light-on-dark variant and check the colour-mode toggle again:

```json
{
  "logo": "assets/logo.svg",
  "logoDark": "assets/logo-dark.svg"
}
```

**6. Only now reach for CSS.** Most themes never need this step. When you do,
add `"stylesheet": "assets/theme.css"` and write plain CSS against the
structural classes listed below. Remember it is unlayered, so any colour you
set here must also be set under `.dark`.

```css
.a-auth-shell-card { border: 1px solid var(--authup-surface-border); }
.a-login-provider-box { border-radius: 2px; }

.dark .a-auth-shell-card { border-color: #332f2c; }
```

**7. Ship it.** Mount the same directory read-only in production. In
Kubernetes the whole thing fits in one ConfigMap, and the
[helm chart](https://helm.authup.org) takes it as values:

```yaml
server:
  theme:
    enabled: true
    files:
      theme.json: |
        {"version": 1, "tokens": {"--authup-periwinkle": "#c0392b"}}
      assets/theme.css: |
        .a-auth-shell-card { border-radius: 2px; }
```

The rest of this page is the reference for what you just used.

## Layout

```
/etc/authup/theme/
  theme.json          design tokens, title, favicon, logo, stylesheet
  assets/             the only directory served over HTTP, at /theme
    theme.css
    logo.svg
    logo-dark.svg
    favicon.svg
    inter.woff2
  fragments/          opt-in, see Head fragment below
    head.html
```

`assets/` is a subdirectory on purpose. The HTTP mount root is
`<themeDirectoryPath>/assets`, never the theme root, so `theme.json` is
unreachable over HTTP by construction.

Servable file types are `.css`, `.svg`, `.png`, `.jpg`, `.jpeg`, `.gif`,
`.webp`, `.avif`, `.ico`, `.woff` and `.woff2`. Anything else returns 404,
including `.html` and `.js`.

## `theme.json`

```json
{
  "version": 1,
  "title": "Sign in to ACME",
  "favicon": "assets/favicon.svg",
  "logo": "assets/logo.svg",
  "logoDark": "assets/logo-dark.svg",
  "stylesheet": "assets/theme.css",
  "tokens": {
    "--authup-periwinkle": "#c0392b",
    "--authup-auth-accent": "#c0392b",
    "--authup-auth-accent-alt": "#e08e79",
    "--authup-auth-card-max-width": "520px",
    "--authup-auth-card-border-radius": "2px",
    "--authup-auth-aurora-opacity": "0",
    "--authup-account-nav-active-background": "#c0392b",
    "--authup-surface-app": "#f5f3f0",
    "--authup-surface-card": "#ffffff",
    "--authup-surface-border": "#e2ded8",
    "--authup-on-surface": "#1c1a19",
    "--authup-on-surface-muted": "#6b6560",
    "--font-sans": "Inter, system-ui, sans-serif",
    "--radius-md": "2px"
  },
  "tokensDark": {
    "--authup-auth-accent": "#e06c5a",
    "--authup-surface-app": "#141312",
    "--authup-surface-card": "#201e1d",
    "--authup-surface-border": "#332f2c",
    "--authup-on-surface": "#efece8",
    "--authup-on-surface-muted": "#a49c95"
  }
}
```

`tokens` applies always, `tokensDark` only in dark mode. Both are emitted into
a dedicated CSS cascade layer, so they win over the bundle without
`!important` and the colour-mode switcher keeps working.

::: warning A colour in `tokens` overrides dark mode too
Cascade layers beat specificity, so a `:root` token from `tokens` wins over
authup's own `.dark` rule. That is what you want for a brand accent, which is
the same in both modes, and wrong for a surface colour: set
`--authup-surface-card` in `tokens` alone and dark mode gets the light card.

Rule of thumb: accents go in `tokens`; anything named `--authup-surface-*` or
`--authup-on-surface*` belongs in both `tokens` and `tokensDark`. The same
applies to any colour you set in `theme.css`.
:::

`logo` replaces the built-in mark on the auth and account consoles. It must be
an image (`.svg`, `.png`, `.jpg`, `.gif`, `.webp`, `.avif`, `.ico`) and is
painted into the existing mark's box, so it needs no size and changes no
layout. Square artwork works best.

`logoDark` is the dark-mode variant. Without it dark mode reuses `logo`, which
is wrong for a mark drawn dark-on-light: it disappears against the dark card.
You can also set `logoDark` alone to override only dark mode and keep the
built-in mark in light.

Token names must be lowercase custom properties (`--foo-bar`). Values are
capped at 256 characters and may not contain `}`, `<`, `>`, `;`, `@`, `\`,
`/*`, `url(` or `expression(`. Use `theme.css` when you need `url()`.

An unknown key in the manifest fails the boot rather than being silently
ignored, so a typo is reported instead of quietly doing nothing.

### Tokens worth knowing

**One line that does a lot.** `--authup-periwinkle` is the brand accent the
entire primary colour scale is mixed from, so setting it alone recolours the
submit button, focus rings, the active account navigation tab, realm tile
hover borders and the login backdrop.

| Group | Controls |
|---|---|
| `--authup-surface-*`, `--authup-on-surface*` | page backdrop, cards, borders, body and muted text. Propagates into every component. |
| `--authup-auth-*` | the logged-out chrome: accent, backdrop aurora, card width, padding, radius, shadow, logo background |
| `--authup-account-*` | the account console shell: width, surfaces, nav hover and active states, card padding and radius |
| `--authup-realm-*` | the realm chooser grid |
| `--authup-picker-item-*` | picker tiles (identity provider, policy type, authenticator kind) |
| `--font-sans`, `--spacing`, `--radius-*`, `--text-*` | the underlying Tailwind scales |

The `--authup-chrome-*`, `--authup-slate-*`, `--authup-salmon` and
`--authup-green` tokens style the admin console's chrome (header, sidebar,
footer). They have no effect on the auth and account consoles, which carry no
such chrome.

## `assets/theme.css`

Plain CSS, linked after everything else, so it beats the token block. Use it
for the things tokens cannot express.

```css
/* Relative to theme.css, not root-absolute. Authup rebases the hrefs it
   generates, but your stylesheet is served verbatim, so "/theme/..." would
   break when authup runs under a public URL prefix. */
@font-face {
  font-family: Inter;
  src: url("./inter.woff2") format("woff2");
  font-weight: 100 900;
  font-display: swap;
}

body { font-family: Inter, system-ui, sans-serif; font-size: 14px; }
h1, h2, h3, h4, h5, h6 { font-family: Inter, system-ui, sans-serif; }

.a-auth-shell-card { border: 1px solid var(--authup-surface-border); }
.a-login-provider-box { border-radius: 2px; }
```

Structural classes you can target: `.a-auth-app`, `.a-auth-shell`,
`.a-auth-shell-card`, `.a-auth-shell-aurora`, `.a-auth-shell-logo`,
`.a-auth-gadget`, `.a-auth-gadgets`, `.a-auth-back-link`, `.a-account-shell`
(plus `-header`, `-brand`, `-title`, `-nav`, `-nav-link`, `-body`),
`.a-realm-grid`, `.a-realm-search`, `.a-picker-item`,
`.a-login-provider-box`.

::: warning Dark mode in theme.css
`theme.css` is unlayered, so it beats every layer including the bundle's
dark-mode rules. Same trap as `tokens` above, with no `tokensDark` to fall
back on: when you set a colour here, write both a `:root` and a `.dark` rule,
dark last.
:::

::: tip Self-host your fonts
An external `url()` makes your login page depend on a third party being up and
leaks the authenticating user's IP to it. Put the font file in `assets/`.
:::

Tailwind runs at build time, so utility classes, `@apply`, `@theme` and
`@source` do nothing in a mounted stylesheet. Write plain CSS, or compile
elsewhere and mount the output.

## Head fragment

For things neither tokens nor CSS can express (a `<meta>` tag, a
`<link rel="preconnect">`, an analytics snippet), put raw markup in
`fragments/head.html` and opt in:

```bash
-e THEME_FRAGMENTS_ENABLED=true
```

It is spliced immediately before `</head>` on every served console, after
everything the manifest emitted, so it can override the token block and the
stylesheet. The file is capped at 64 KB.

The flag defaults to off and the file is not read at all while it is off.
Dropping `fragments/head.html` into the directory does nothing by itself.

::: danger Fragments are unsanitized
The content is passed through verbatim, so a `<script>` there runs on the
origin that holds your users' session cookies. Authup does not sanitize it: a
partial sanitizer would be worse than none, because it invites treating
fragments as safe for untrusted input.

There is deliberately no in-`<body>` slot. Markup next to the consent buttons
would be a far better consent-forgery primitive than markup in `<head>`.
:::

## Reload

Everything is live. You do not restart pods to change a colour.

- `theme.json` and `fragments/head.html` are re-read when they change, at most
  once per second.
- Assets are revalidated per request and return `304` when unchanged, so a
  hard refresh picks up an edit.
- In Kubernetes, `kubectl edit configmap authup-theme` propagates within about
  a minute.

During a rolling restart, replicas can briefly serve two different brands.
Harmless for a colour tweak, visible for a logo or title change.

## When something is wrong

At startup authup logs the resolved theme directory, whether the manifest
loaded, how many tokens it carried and every file it will serve. Check that
first: the most common failure is a path typo, which otherwise just looks like
an un-themed page.

- An invalid `theme.json` **fails the boot**, naming the file and each problem.
- A manifest that becomes invalid **after** boot keeps the previous one and
  logs a warning. A broken theme must never take down a login page.
- A missing asset returns 404 and the page renders without it.

## Replacing a console

Theming cannot change markup. When you need different fields, a different flow,
or different copy, you replace the console package instead:

| | |
|---|---|
| `authConsolePath` / `AUTH_CONSOLE_PATH` | package directory replacing `@authup/client-auth-console` |
| `accountConsolePath` / `ACCOUNT_CONSOLE_PATH` | package directory replacing `@authup/client-account-console` |
| `adminConsolePath` / `ADMIN_CONSOLE_PATH` | package directory replacing `@authup/client-admin-console` |

Each points at a directory containing the built `dist/`. When set, it is used
instead of resolving the packaged console from `node_modules`.

::: danger This replaces the login implementation
The auth console is not a skin over the login. It owns the OIDC prompt ladder
(`prompt=none`, `select_account`, `max_age`), PKCE and `state` handling, MFA
step ordering, and the `redirectUriVerified` gating that keeps OAuth2 errors
from being redirected to unregistered URIs.

A replacement package inherits responsibility for all of it. Use the theme
directory for branding, and reach for this only when you genuinely need a
different flow.
:::

**The auth console contract.** Your package must ship:

- `dist/client/index.html` containing the `<!--preload-links-->` and
  `<!--app-html-->` markers, built with vite `base: '/console/auth/'` (the
  assets then resolve under `/console/auth/assets/`, which is what server-core
  mounts)
- `dist/client/.vite/ssr-manifest.json` (`{}` is valid)
- `dist/server/server.js` exporting `render(ctx)`, plus `CONTRACT_VERSION`
  once the contract moves past version 1 (omitting it means version 1)

`CONTRACT_VERSION` is checked at boot against the version this authup
implements, and a mismatch **stops the container** with a message naming both
versions. That is deliberate: you replaced security-relevant code, so a drift
must not surface as subtly wrong auth pages. A bundle without the export counts
as version 1.

The types are published in the package's `src/contract.ts`
(`HydrationPayload`, `RenderContext`, `RenderResult`, `RenderFunction`).

**The static console contracts** are smaller. Each of the two SPA bundles
must ship `dist/index.html` carrying its configuration marker, plus
`dist/assets/`, built with the vite base authup mounts it under
(`/console/admin/` and `/console/account/`): the shell's asset hrefs are
absolute, so a bundle built for another base is served but loads nothing.

| Console | Marker |
|---|---|
| account console | `<!--account-config-->` |
| admin console | `<!--admin-config-->` |

The marker is checked at boot; without it the injected `window.__AUTHUP__`
never lands and the SPA would silently fall back to deriving its API URL from
the origin.

Every check only runs for a package you actually substituted.
