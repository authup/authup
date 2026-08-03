/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export const THEME_MANIFEST_FILE_NAME = 'theme.json';

/**
 * The ONLY sub-directory reachable over HTTP. The mount root is
 * `<themeDirectoryPath>/assets`, never the theme root, so `theme.json`
 * (and any future non-public file) is unreachable by construction rather
 * than by an extension filter a later edit could loosen.
 */
export const THEME_ASSETS_DIRECTORY_NAME = 'assets';

export const THEME_ASSET_MOUNT_PATH = 'theme';

export const THEME_FRAGMENTS_DIRECTORY_NAME = 'fragments';

/**
 * Raw markup spliced into `<head>`. Read only when the operator opts in
 * via `themeFragmentsEnabled`: a fragment is unsanitized markup on the
 * IdP origin, so it must be a deliberate decision and never a consequence
 * of dropping a file into the mounted directory.
 *
 * Head-only by design. There is deliberately no in-`<body>` slot: a
 * fragment rendered next to the consent buttons is a strictly better
 * consent-forgery primitive than one in `<head>` (it could relabel or
 * overlay Allow with no CSS at all).
 */
export const THEME_HEAD_FRAGMENT_FILE_NAME = 'head.html';

export const THEME_HEAD_FRAGMENT_MAX_LENGTH = 64 * 1024;

/**
 * A manifest declares the contract version it was written against. An
 * unknown version fails the boot instead of being partially understood.
 */
export const THEME_MANIFEST_VERSION = 1;

/**
 * Token names are validated by GRAMMAR, not against a closed list of the
 * `--authup-*` properties the theme packages happen to declare today.
 *
 * A closed list would have to live in this package, which cannot depend on
 * `@authup/client-web-kit-theme`, so nothing could bind the two and it
 * would rot in both directions: a newly added CSS token would fail
 * validation for a legitimate override, and a removed one would stay
 * accepted. The grammar cannot rot, and it is the same validation an
 * untrusted (per-realm) token source would need unchanged.
 */
export const THEME_TOKEN_NAME_PATTERN = /^--[a-z][a-z0-9-]*$/;

export const THEME_TOKEN_VALUE_MAX_LENGTH = 256;

/**
 * Keeps a token value from closing the declaration block, opening a tag,
 * starting a new at-rule or comment, or turning the server-emitted token
 * block into a request-emitting sink (`url(`). Layer 2 (`theme.css`) may
 * of course use `url()`; that asymmetry is deliberate and documented.
 */
export const THEME_TOKEN_VALUE_FORBIDDEN_PATTERN = /[}<>;@\\]|\/\*|url\s*\(|expression\s*\(/i;

/**
 * Every servable extension and the content type it is pinned to. Notably
 * excludes `.html` and `.js`, so a stray document or script in the mounted
 * directory can never be served from the IdP origin.
 */
export const THEME_ASSET_CONTENT_TYPES : Record<string, string> = {
    '.css': 'text/css; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.avif': 'image/avif',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
};

/**
 * Derived, never hand-maintained: the allowlist and the content-type map
 * must describe the same set, or a servable extension would be sent with
 * an undefined content type.
 */
export const THEME_ASSET_EXTENSIONS = Object.keys(THEME_ASSET_CONTENT_TYPES);

/**
 * An SVG navigated to directly executes inline script, and a theme
 * directory is exactly where operator SVGs land. This neutralizes that
 * while leaving `<img>` and `background-image` rendering intact.
 */
export const THEME_ASSET_CSP = "default-src 'none'; style-src 'unsafe-inline'; img-src data:; sandbox";

/**
 * Debounce for the manifest mtime re-check. A burst of renders costs one
 * stat; an edit takes effect on the next render after the window.
 */
export const THEME_MANIFEST_REVALIDATE_INTERVAL = 1_000;

/**
 * The CSS layer the token block is emitted into.
 *
 * A layer name not present in the bundle's `@layer` statement is appended
 * LAST in the layer order, so it beats `@layer authup` (the kit tokens)
 * and `@layer base` (the app theme's brand rebinds and its `.dark` flips)
 * without needing `!important`. Inside the block `.dark` beats `:root` by
 * source order, so dark mode keeps working.
 *
 * Deliberately NOT an inline `style` attribute on `<html>`: that would win
 * permanently, and the color-mode switcher flips the `.dark` class
 * client-side with no reload, which would freeze the brand at whatever the
 * cookie said at render time.
 */
export const THEME_CSS_LAYER_NAME = 'authup-theme';
