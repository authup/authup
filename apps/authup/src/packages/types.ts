/*
 * Copyright (c) 2024-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { LaunchablePackageID } from './constants';

export type PackageEntrypoint = {
    type: 'node',
    path: string,
} | {
    type: 'npx',
    packageName: string,
    /**
     * Version to pin the fetched package to. Releases are lockstep, so this is
     * the launcher's own version — without it npx would fetch the current
     * latest and pair a released launcher with a newer application.
     */
    version?: string,
};

export type PackageProcessArgv = {
    exec: string,
    args: string[],
};

export type LaunchPlan = {
    packages: LaunchablePackageID[],
    /**
     * Deprecation notices for selectors that are accepted but launch nothing.
     */
    warnings: string[],
    commandArgs: string[],
};
