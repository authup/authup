/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Logger } from '@authup/server-kit';

/**
 * The operator-authored `theme.json`, after validation.
 *
 * `favicon` / `stylesheet` are theme-relative paths inside `assets/`; they
 * are emitted as `<basePath>/theme/<name>` hrefs.
 */
export type ThemeManifest = {
    version: number,
    title?: string,
    favicon?: string,
    stylesheet?: string,
    tokens?: Record<string, string>,
    tokensDark?: Record<string, string>,
};

export type ThemeProviderContext = {
    /**
     * Absolute path of the theme root (normalizeConfig resolves a relative
     * value against the rootPath).
     */
    directoryPath: string,
    logger?: Logger,
};

export interface IThemeProvider {
    /**
     * Read + validate the manifest and resolve the servable asset root.
     * Throws on an invalid manifest, so a typo fails the boot rather than
     * silently rendering an un-themed page.
     */
    load() : Promise<void>;

    /**
     * The current manifest, re-read when the file changed on disk. Returns
     * undefined when the directory carries no manifest (Layer 2 only).
     */
    getManifest() : ThemeManifest | undefined;

    /**
     * The realpathed `<root>/assets` directory, or undefined when absent.
     * Every served path is re-checked against this value.
     */
    getAssetsPath() : string | undefined;

    /**
     * The markup injected before `</head>`, memoized per base path.
     */
    getHead(basePath: string) : string;
}
