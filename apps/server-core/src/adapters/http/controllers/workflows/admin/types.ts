/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ConsoleLoginContext } from '../console-login/index.ts';

export type AdminControllerOptions = {
    baseURL: string,
    /**
     * Where the console this authenticates for is served. The browser lands
     * there once the credential is issued, and a refusal renders there.
     */
    consoleUrl: string,
    enabled: boolean,
};

export type AdminControllerContext = Omit<ConsoleLoginContext, 'options'> & {
    options: AdminControllerOptions,
};
