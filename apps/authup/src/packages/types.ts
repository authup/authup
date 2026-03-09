/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ChildProcess } from 'node:child_process';

export interface Package {
    execute(command: string, options: PackageExecuteOptions) : Promise<ChildProcess>;
}

export type PackageExecuteOptions = {
    configFile?: string,
    configDirectory?: string,
};
