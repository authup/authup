/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Config } from '../type';
import { DatabaseOptions } from './type';
import { ConfigDefault } from '../constants';
import { removePrefixFromConfigKey } from '../utils';

export function buildDatabaseOptionsFromConfig(config: Config) : DatabaseOptions {
    const options : DatabaseOptions = {
        permissions: [],

        adminUsername: ConfigDefault.ADMIN_USERNAME as string,
        adminPassword: ConfigDefault.ADMIN_PASSWORD as string,

        robotEnabled: false,
    };

    const keys = Object.keys(config);
    for (let i = 0; i < keys.length; i++) {
        if (keys[i].startsWith('database')) {
            const targetKey = removePrefixFromConfigKey(keys[i], 'database');
            const value = config[keys[i]];

            switch (targetKey) {
                case 'permissions':
                    options.permissions = Array.isArray(value) ?
                        value :
                        value.split(',');
                    break;
                default:
                    options[targetKey] = value;
                    break;
            }
        }
    }

    return options;
}
