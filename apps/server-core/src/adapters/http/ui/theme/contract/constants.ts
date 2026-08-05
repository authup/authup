/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * The theme CONTRACT: the on-disk layout, the manifest vocabulary and the
 * URL space a theme occupies. Everything here is portable — no node APIs,
 * no HTTP — so a browser-side theme editor or a CLI validator can share it
 * verbatim. Serving concerns (headers, caches, mounts) live one level up.
 */

export const THEME_MANIFEST_FILE_NAME = 'theme.json';

/**
 * The ONLY sub-directory reachable over HTTP. The mount root is
 * `<themeDirectoryPath>/assets`, never the theme root, so `theme.json`
 * (and any future non-public file) is unreachable by construction rather
 * than by an extension filter a later edit could loosen.
 */
export const THEME_ASSETS_DIRECTORY_NAME = 'assets';

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

/** The path segment the theme's `assets/` directory is served under. */
export const THEME_ASSET_MOUNT_PATH = 'theme';

/**
 * A manifest declares the contract version it was written against. An
 * unknown version fails the boot instead of being partially understood.
 */
export const THEME_MANIFEST_VERSION = 1;

/**
 * Token names are validated by GRAMMAR, not against a closed list of the
 * `--authup-*` properties the theme packages happen to declare today.
 *
 * A closed list would have to live here, and this package cannot depend on
 * `@authup/client-web-kit-theme`, so nothing could bind the two and it
 * would rot in both directions: a newly added CSS token would fail
 * validation for a legitimate override, and a removed one would stay
 * accepted. The grammar cannot rot.
 *
 * It is NOT sufficient for an untrusted (per-realm) token source, and a
 * later rung must not adopt it unchanged. Values are guarded by a denylist
 * of CSS functions, and a denylist over a language that keeps gaining
 * functions leaks by construction: `image-set()` and `src()` already had
 * to be added after `url()`. Filesystem input is operator trust, equal to
 * the process, so a denylist is proportionate here. Untrusted input needs
 * an allowlist of accepted value SHAPES (a colour, a length, a keyword)
 * per token, which is a different validator.
 */
export const THEME_TOKEN_NAME_PATTERN = /^--[a-z][a-z0-9-]*$/;

export const THEME_TOKEN_VALUE_MAX_LENGTH = 256;

/**
 * Every CSS function that can load a remote resource.
 *
 * Blocking `url(` alone does not close the request-emitting-sink hole:
 * `image-set()`, `image()`, `src()` and `cross-fade()` all take a bare
 * string URL, and a token like `--authup-auth-logo-image` is substituted
 * straight into an image-accepting property. `element()` and `paint()`
 * cannot fetch, but they render document content into a paint sink and
 * have no business in an operator token either.
 *
 * A denylist over function names is still a denylist, so this list is the
 * floor rather than the argument: the values it guards are operator
 * authored, and an operator can already ship arbitrary CSS through
 * `theme.css`. It exists so a value cannot QUIETLY do something the
 * grammar advertises as impossible. A per-realm (untrusted) token source
 * must not reuse it as-is; see the note on the name pattern below.
 */
const THEME_TOKEN_VALUE_FORBIDDEN_FUNCTIONS = [
    'url',
    'expression',
    'image',
    'image-set',
    'src',
    'cross-fade',
    'element',
    'paint',
];

/**
 * Keeps a token value from closing the declaration block, opening a tag,
 * starting a new at-rule or comment, or turning the server-emitted token
 * block into a request-emitting sink. Layer 2 (`theme.css`) may of course
 * use `url()`; that asymmetry is deliberate and documented.
 *
 * `{` is forbidden alongside `}`: it opens a block inside the declaration,
 * which swallows the rule that follows. One stray brace in a light token
 * silently absorbs the whole `.dark` rule, so dark mode stops applying
 * with no error anywhere.
 *
 * Vendor prefixes are covered (`-webkit-image-set(`), and so is whitespace
 * before the paren; escapes cannot be used to smuggle a name past this
 * because `\` is forbidden outright.
 */
export const THEME_TOKEN_VALUE_FORBIDDEN_PATTERN = new RegExp(
    `[{}<>;@\\\\]|\\/\\*|(?:^|[^a-z0-9-])(?:-[a-z]+-)?(?:${THEME_TOKEN_VALUE_FORBIDDEN_FUNCTIONS.join('|')})\\s*\\(`,
    'i',
);

/**
 * Every asset kind a theme may contain, and the content type it is pinned
 * to when served. Notably excludes `.html` and `.js`, so a stray document
 * or script in the mounted directory can never be served from the IdP
 * origin.
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
 * The subset a `logo` may use. Derived from the content-type map so a new
 * image type is servable and usable as a logo in one edit.
 */
export const THEME_IMAGE_EXTENSIONS = THEME_ASSET_EXTENSIONS
    .filter((extension) => THEME_ASSET_CONTENT_TYPES[extension].startsWith('image/'));

/**
 * Emitted by server-core from a manifest's `logo`, never authored as a raw
 * token: the value carries a `url()`, which the token grammar forbids for
 * operator-supplied values so the token block cannot become a
 * request-emitting sink. The href is built from an already-validated asset
 * path.
 */
export const THEME_LOGO_TOKENS = [
    { image: '--authup-auth-logo-image', markVisibility: '--authup-auth-logo-mark-visibility' },
    { image: '--authup-account-logo-image', markVisibility: '--authup-account-logo-mark-visibility' },
] as const;

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
