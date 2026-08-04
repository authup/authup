/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * SERVING constants. The theme's own vocabulary (layout, manifest, tokens,
 * asset kinds) lives in contract/, which stays portable.
 */

/**
 * Debounce for the manifest mtime re-check. A burst of renders costs one
 * stat; an edit takes effect on the next render after the window.
 */
export const THEME_MANIFEST_REVALIDATE_INTERVAL = 1_000;

/**
 * An SVG navigated to directly executes inline script, and a theme
 * directory is exactly where operator SVGs land. This neutralizes that
 * while leaving `<img>` and `background-image` rendering intact.
 */
export const THEME_ASSET_CSP = "default-src 'none'; style-src 'unsafe-inline'; img-src data:; sandbox";
