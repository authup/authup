/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * The operator-authored `theme.json`, after validation.
 *
 * `favicon` / `logo` / `stylesheet` are theme-relative paths inside
 * `assets/`; they are emitted as `<basePath>/theme/<name>` hrefs.
 */
export type ThemeManifest = {
    version: number,
    title?: string,
    favicon?: string,

    /**
     * Replaces the built-in logo mark on both consoles. Maps onto the
     * `--authup-{auth,account}-logo-*` token pairs.
     */
    logo?: string,

    /**
     * Dark-mode variant of `logo`. Without it dark mode inherits `logo`,
     * which is wrong for a mark that is dark-on-light. Usable on its own to
     * override only dark mode.
     */
    logoDark?: string,

    stylesheet?: string,
    tokens?: Record<string, string>,
    tokensDark?: Record<string, string>,
};
