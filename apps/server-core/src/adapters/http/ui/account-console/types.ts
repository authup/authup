/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { StatusResponseFeatures } from '@authup/core-http-kit';

export type AccountConsoleServeOptions = {
    baseURL: string,
    features: StatusResponseFeatures,
    /**
     * Trusted application origins (`getAppOrigins(config)`). The allowlist
     * the `ref` back-link parameter is validated against.
     */
    trustedOrigins: string[],
};
