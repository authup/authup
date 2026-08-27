/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * The `theme.*` section: the operator theme every console service applies.
 *
 * It sits outside `server.*` because it describes the deployment's branding
 * rather than one service, and all three consoles read the same two values.
 */
export type ThemeConfig = {
    /**
     * The operator theme directory, read by all three console services. An
     * empty value disables theming entirely: no provider is created and no
     * route is mounted.
     *
     * default: '' (off)
     */
    themeDirectoryPath: string,

    /**
     * Opt in to splicing `fragments/head.html` from the theme directory into
     * the head of every served console.
     *
     * default: false
     */
    themeFragmentsEnabled: boolean,
};
