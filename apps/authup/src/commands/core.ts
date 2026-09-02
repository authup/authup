/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ConfigReadFsOptions } from '@authup/server-config';
import { defineApplicationCommand } from './application.ts';

export function defineCLICoreCommand(configFs: ConfigReadFsOptions = {}) {
    return defineApplicationCommand(configFs, {
        name: 'core',
        description: 'Start the API and the IdP alone; the consoles are served by `authup console`.',
        consoles: false,
    });
}
