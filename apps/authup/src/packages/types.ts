/*
 * Copyright (c) 2024-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PackageID } from './constants';

export type PackageEntrypoint = {
    type: 'node',
    path: string,
} | {
    type: 'npx',
    packageName: string,
};

export type PackageProcessArgv = {
    exec: string,
    args: string[],
};

export type LaunchPlan = {
    packages: `${PackageID}`[],
    commandArgs: string[],
};
