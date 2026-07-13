# design-sync notes — authup/authup

## The one thing to know first

**This repo is outside the design-sync converter's envelope.** The component
kit (`@authup/client-web-kit` + `@vuecs/*`) is **Vue 3**; Claude Design renders
React only ("a non-React DS has nothing for the design agent to build with").
There is no Storybook and no React surface anywhere in the monorepo. A faithful
component sync is impossible without a reimplementation, which the skill
forbids. **Do not run the converter scripts here.**

The agreed fallback (user-approved 2026-07-12): a hand-authored
**tokens-and-styles-only** sync — canonical design tokens + the plain-CSS layer
of the kit's logged-out auth chrome, no component bundle, no `_ds_sync.json`
anchor (honest omission for a hand-authored shape; every re-sync re-verifies,
which is cheap at this size).

## Target project — additive contract (IMPORTANT)

`projectId` (pinned in config.json) is the user's **pre-existing, hand-built**
"Authup Design System" project — re-adopted on explicit user choice, NOT
created by this skill. It contains hand-authored content that must never be
overwritten or deleted by a sync:

- root `styles.css`, `colors_and_type.css`, `README.md`, `SKILL.md`
- `preview/_base.css` and all pre-existing `preview/*.html` cards
- `ui_kits/**`, `assets/**` (logo kit), `scraps/**`, design-canvas files

Files **owned by this sync** (safe to rewrite on re-sync):

- `tokens/authup-tokens.css` — canonical token sheet
- `tokens/authup-auth-components.css` — verbatim kit auth-chrome CSS
- `guidelines/repo-token-sync.md` — vocabulary + drift report
- `preview/tokens-canonical-surfaces.html`, `preview/tokens-primary-ramp.html`,
  `preview/components-auth-shell.html` — cards, group "Repo sync"
- `_ds_needs_recompile` — refresh marker (write first as fence, re-arm last)

## Re-sync procedure (custom shape)

1. Re-derive the token sheet from:
   `packages/client-web-theme/assets/css/index.css` (brand, surfaces, chrome,
   vc bridge, primary ramp), `packages/client-web-kit-theme/assets/css/styles/
   tokens.css` (kit component tokens), `.../styles/{auth,realm,picker,login}.css`
   (verbatim component CSS), `client-web-theme/assets/css/styles/root.css`
   (typography). Kit defaults overridden by app-level rebinds → emit the
   winning value, note the kit default in a comment.
2. Stage into `ds-bundle/` (gitignored). `ds-bundle/preview/_base.css` is a
   LOCAL VERIFY COPY of the project's card base stylesheet — never upload it.
3. Verify cards visually: serve ds-bundle with `python3 -m http.server`, then
   screenshot with the playwright-cache headless shell
   (`~/Library/Caches/ms-playwright/chromium_headless_shell-*/chrome-headless-shell-mac-arm64/chrome-headless-shell
   --headless --screenshot=… --window-size=WxH URL`). The Chrome extension MCP
   was not connected on this machine.
4. Cross-check every class/token named in the guidelines against the shipped
   CSS (grep) before upload.
5. `finalize_plan` with the exact owned paths above, `deletes: []`, then
   sentinel → files → sentinel re-arm.

## Gotchas learned

- The kit component CSS assumes **Tailwind preflight**: standalone consumers
  (and preview cards) need `* { box-sizing: border-box }` and
  `a { text-decoration: none }` or the realm-search input overflows the auth
  card and links render underlined.
- The project's existing cards put the `@dsCard` marker on line 2 (after
  `<!doctype html>`), use Google-Fonts links + relative `_base.css`; cross-dir
  relative links (`../tokens/…`) are the converter norm and work.
- The auth card is 460px max-width: three realm tiles wrap to two rows and
  overflow a 520px-high card viewport — keep the demo grid to two tiles.
- The project's hand-authored `colors_and_type.css` predates the Tailwind-v4
  theme rework and has drifted (Bootstrap-blue `--authup-primary: #337ab7`,
  chrome-never-flips model, `[data-theme]` toggle, missing chrome/kit tokens).
  The drift report lives in `guidelines/repo-token-sync.md` (uploaded) and
  `.design-sync/conventions.md` (committed master copy). Deliberately NOT
  auto-fixed — their previews/ui_kits may depend on the old values; adopting
  the canonical sheet is the user's / their design agent's call.
- Dark mode: repo-canonical selector is the `.dark` class; the synced token
  sheet also matches `[data-theme="dark"]` for the project's older previews.
