/*
 * Copyright (c) 2021-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ConfigReadFsOptions } from '@authup/server-config';
import { defineApplicationCommand } from './application.ts';

export function defineCLIStartCommand(configFs: ConfigReadFsOptions = {}) {
    return defineApplicationCommand(configFs, {
        name: 'start',
        description: 'Start the API and every enabled console on one listener: the single-process deployment.',
        consoles: true,
    });
}
