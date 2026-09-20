/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { defineCommand } from 'citty';
import { RESOURCE_NAMES } from '../resource/constants.ts';
import { defineCLIResourceCommand } from '../resource/index.ts';
import { defineCLIAPIRequestCommand } from './request.ts';

export function defineCLIAPICommand() {
    return defineCommand({
        meta: { name: 'api', description: 'Query and modify API resources using the saved login.' },
        subCommands: {
            request: defineCLIAPIRequestCommand(),
            ...Object.fromEntries(RESOURCE_NAMES.map((resource) => [resource, defineCLIResourceCommand(resource)])),
        },
    });
}
