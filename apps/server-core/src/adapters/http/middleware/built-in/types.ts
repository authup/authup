/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Logger } from '@authup/server-kit';

export type AssetsMiddlewareOptions = {
    /**
     * Absolute path of the operator theme directory. Empty or missing
     * disables theming entirely.
     */
    themeDirectoryPath?: string,
    logger?: Logger,
};
