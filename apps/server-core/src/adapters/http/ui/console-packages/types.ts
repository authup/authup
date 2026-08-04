/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export type ConsolePackageOptions = {
    /**
     * Package directory of a substituted @authup/client-auth-console.
     * Empty resolves the packaged one from node_modules.
     */
    authConsolePath?: string,

    /**
     * Package directory of a substituted @authup/client-account-console.
     */
    accountConsolePath?: string,
};
