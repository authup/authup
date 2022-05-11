/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { DatabaseOptions, DatabaseSeedOptions } from '../type';
import { Subset } from '../../types';
import { requireBooleanFromEnv, requireFromEnv } from '../../utils';

export function extendDatabaseOptions(options: Subset<DatabaseOptions>) : DatabaseOptions {
    if (!options.seed) {
        options.seed = {} as DatabaseSeedOptions;
    }

    if (!options.seed.admin) {
        options.seed.admin = {} as DatabaseSeedOptions['admin'];
    }

    if (!options.seed.admin.username) {
        options.seed.admin.username = requireFromEnv('ADMIN_USERNAME', 'admin');
    }

    if (!options.seed.admin.password) {
        options.seed.admin.password = requireFromEnv('ADMIN_PASSWORD', 'start123');
    }

    if (!options.seed.robot) {
        options.seed.robot = {} as DatabaseSeedOptions['robot'];
    }

    if (!options.seed.robot.enabled) {
        options.seed.robot.enabled = requireBooleanFromEnv('ROBOT_ENABLED', true);
    }

    if (!options.seed.robot.secret) {
        const envValue = requireFromEnv('ROBOT_SECRET', null) || undefined;
        if (envValue) {
            options.seed.robot.secret = envValue;
        }
    }

    if (!options.seed.permissions) {
        const permissions = requireFromEnv('PERMISSIONS', null);
        if (permissions) {
            options.seed.permissions = permissions.split(',').filter();
        } else {
            options.seed.permissions = [];
        }
    }

    return options as DatabaseOptions;
}
