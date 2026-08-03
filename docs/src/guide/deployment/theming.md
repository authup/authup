# Theming

Authup serves two consoles from the identity provider origin: the **auth
console** (the login, consent, registration, activation, password and logout
pages) and the **account console** at `/account`. Both can be rebranded from a
directory you mount into the container. No image build, no rebuild of authup.

## What you can and cannot change

Both consoles are compiled Vue bundles, so there is no request-time template
engine. That draws a hard line through what theming can do.

| | Reachable |
|---|---|
| Colours, surfaces, borders | yes |
| Spacing, radii, font sizes, font family | yes |
| Logo, favicon, background imagery | yes |
| Document title | yes |
| Extra `<head>` content (fonts, meta tags) | yes, opt-in |
| Markup, field order, which controls exist | no |
| UI copy and translations | no |
| Icons | no |

If you need markup, you are building your own console against the render
contract, not theming. That path is deliberately separate and is not covered
here.

::: warning Trust boundary
The theme directory is as sensitive as `authup.conf`. Its stylesheet is loaded
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

## Layout

```
/etc/authup/theme/
  theme.json          design tokens, title, favicon, stylesheet
  assets/             the only directory served over HTTP, at /theme
    theme.css
    logo.svg
    favicon.svg
    inter.woff2
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
`--authup-green` tokens style the separately-deployed admin console and have
no effect on the two consoles authup serves.

## `assets/theme.css`

Plain CSS, linked after everything else, so it beats the token block. Use it
for the things tokens cannot express.

```css
@font-face {
  font-family: Inter;
  src: url("/theme/inter.woff2") format("woff2");
  font-weight: 100 900;
  font-display: swap;
}

body { font-family: Inter, system-ui, sans-serif; font-size: 14px; }
h1, h2, h3, h4, h5, h6 { font-family: Inter, system-ui, sans-serif; }

/* Logo swap. The shell renders its mark as an inline svg. */
.a-auth-shell-logo svg { display: none; }
.a-auth-shell-logo {
  width: 44px; height: 44px;
  background: url("/theme/logo.svg") center / contain no-repeat;
}

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
`theme.css` is unlayered, so it also overrides the bundle's dark-mode rules.
A colour set only under `:root` there will leak into dark mode. Put colours in
`theme.json` where possible; when you must set one in CSS, write both `:root`
and a `.dark` rule, dark last.
:::

::: tip Self-host your fonts
An external `url()` makes your login page depend on a third party being up and
leaks the authenticating user's IP to it. Put the font file in `assets/`.
:::

Tailwind runs at build time, so utility classes, `@apply`, `@theme` and
`@source` do nothing in a mounted stylesheet. Write plain CSS, or compile
elsewhere and mount the output.

## Reload

Everything is live. You do not restart pods to change a colour.

- `theme.json` is re-read when it changes, at most once per second.
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
