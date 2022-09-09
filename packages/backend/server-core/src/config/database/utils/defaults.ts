/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { DatabaseOptions } from '../type';

export function extendDatabaseOptionsWithDefaults(input: Partial<DatabaseOptions>) : DatabaseOptions {
    return {
        ...input,

        adminUsername: input.adminUsername || 'admin',
        adminPassword: input.adminPassword || 'start123',

        robotEnabled: input.robotEnabled ?? false,

        permissions: input.permissions || [],
    };
}
