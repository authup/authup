# Repo token sync — canonical authup tokens

Machine-derived from the `authup/authup` monorepo (commit `a6dca3c9a`, synced
2026-07-12). When these files and a hand-authored file in this project
disagree, **these files carry the shipped product's current values.**

## What was synced

| File | Contents | Source of truth in the repo |
|---|---|---|
| `tokens/authup-tokens.css` | All design tokens: brand accents, slate ramp, light+dark surfaces, flipping chrome model, vuecs semantic bridge, periwinkle primary ramp, auth/realm/picker/login component tokens, typography | `packages/client-web-theme/assets/css/index.css`, `packages/client-web-kit-theme/assets/css/styles/tokens.css`, `packages/client-web-theme/assets/css/styles/root.css` |
| `tokens/authup-auth-components.css` | Verbatim component CSS for the logged-out chrome: `.a-auth-shell` (aurora + card), `.a-auth-gadget`, `.a-auth-back-link`, `.a-realm-grid` (tiles, search, skeleton, empty state), `.a-picker-item`, `.a-login-provider-box` | `packages/client-web-kit-theme/assets/css/styles/{auth,realm,picker,login}.css` |

## How to build with it

Load order: tokens first, then components (the components file `@import`s the
tokens itself, so importing only it also works):

```html
<link rel="stylesheet" href="tokens/authup-auth-components.css">
```

- **Setup**: the kit CSS assumes Tailwind preflight — at minimum set
  `* { box-sizing: border-box }` and `a { text-decoration: none }` globally,
  or inputs/links inside the auth card render slightly off.
- **Style via CSS custom properties** — `var(--authup-*)` for authup identity,
  `var(--vc-color-*)` for the semantic layer (bg / fg / border / primary
  ramp). Never hard-code a hex that has a token.
- **Login-ish screens**: use the real classes — wrap in
  `.a-auth-shell` → `.a-auth-shell-aurora` + `.a-auth-shell-card`; realm
  pickers are `.a-realm-grid` > `.a-realm-grid-item` (with
  `.a-realm-grid-item-name` / `-slug`).
- **Dark mode**: add class `dark` (repo-canonical) or
  `data-theme="dark"` (this project's older previews) on a root element.
  Chrome tokens re-pin to the slate ramp; surfaces flip to the dark ramp
  (`#16171a < #1f2024 < #26272c < #2d2f35 < #34373d`).
- **Primary actions** paint `--vc-color-primary-600` (pure periwinkle) with
  `--vc-color-on-primary` (#fff) text.

Minimal idiomatic snippet:

```html
<div class="a-auth-shell">
  <div class="a-auth-shell-aurora"></div>
  <div class="a-auth-shell-card">
    <h2 style="font-family: var(--authup-font-display); margin: 0;">Sign in</h2>
    <div class="a-realm-grid">
      <div class="a-realm-grid-item">
        <span class="a-realm-grid-item-name">master</span>
        <span class="a-realm-grid-item-slug">the admin realm</span>
      </div>
    </div>
  </div>
</div>
```

## Drift found vs this project's hand-authored `colors_and_type.css`

The hand-authored extraction predates the repo's Tailwind-v4 theme rework.
Where they disagree, the repo has moved on:

1. **Primary is periwinkle, not Bootstrap blue.** `--authup-primary: #337ab7`
   (+ hover/dark/info/success/warning/danger Bootstrap variants) no longer
   exists in the repo. Primary = `#6d7fcc` with a `color-mix` ramp
   (`--vc-color-primary-50…950`); status colors come from `@vuecs/design`'s
   OKLCH semantic palettes, not authup-owned tokens.
2. **The chrome now flips with the mode.** "Chrome stays slate in BOTH
   themes" is outdated: light mode renders the header/sidebar/footer as a
   light raised surface (`--authup-chrome-*` aliasing the semantic tokens);
   only dark mode pins the slate ramp. New tokens: `--authup-chrome-bg`,
   `-bg-elevated`, `-fg`, `-fg-muted`, `-border`,
   `--authup-chrome-edge-shadow-{bottom,top,right}` (drop shadow in light,
   recessed inset band in dark).
3. **The signature title bar is periwinkle, not slate.** The 4px
   `.title::before` bar paints `var(--authup-periwinkle)` in the repo
   (`generics.css`), not `--authup-slate-800`.
4. **Dark-mode selector is a `.dark` class**, toggled by the in-app switch
   (Tailwind `@custom-variant`), not `[data-theme="dark"]` /
   `prefers-color-scheme`. The synced token sheet supports both selectors.
5. **New component token groups** absent from the old extraction:
   `--authup-auth-*` (auth card, aurora, logo), `--authup-realm-grid-*`,
   `--authup-picker-item-*`, `--authup-login-provider-*`.
6. **Salmon narrowed.** `#ff5b5b` is now dropdown-hover text only, no longer
   footer links.
7. **Legacy `--authup-bg-*` aliases** (`--authup-bg-app`, `-content`, `-card`,
   `-list`, `-list-active`, `-page`) don't exist in the repo — the
   `--authup-surface-*` group is the only surface vocabulary.

## What is deliberately NOT here

- **Live components.** The kit (`@authup/client-web-kit`) is Vue 3; Claude
  Design renders React, so no component bundle is synced. The CSS above is
  the faithful, framework-neutral layer of the same components.
- **The Tailwind utility layer and vuecs `<VC*>` class maps** — they require
  a Tailwind JIT build against the app's sources and are not extractable as
  static CSS.
- **Fonts** — Asap + Nunito load from Google Fonts (this project's root
  `styles.css` already does that; the repo's client-web uses
  `@nuxtjs/google-fonts`).
