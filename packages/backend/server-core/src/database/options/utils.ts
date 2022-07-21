/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Config } from '../../config';
import { DatabaseOptions } from '../type';
import { ConfigDefault } from '../../config/constants';

export function buildDatabaseOptionsFromConfig(config: Config) : DatabaseOptions {
    config.permissions = config.permissions || [];
    const permissions = Array.isArray(config.permissions) ?
        config.permissions :
        config.permissions.split(',');

    return {
        seed: {
            admin: {
                username: config.adminUsername || ConfigDefault.ADMIN_USERNAME,
                password: config.adminPassword || ConfigDefault.ADMIN_PASSWORD,
                passwordReset: config.adminPasswordReset,
            },
            robot: {
                enabled: config.robotEnabled ?? false,
                secret: config.robotSecret,
                secretReset: config.robotSecretReset,
            },
            permissions,
        },
    };
}
