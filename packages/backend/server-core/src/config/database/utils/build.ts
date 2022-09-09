/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import defu from 'defu';
import { ConfigInput } from '../../type';
import { DatabaseOptions, DatabaseOptionsInput } from '../type';
import { extendDatabaseOptionsWithDefaults } from './defaults';
import { extractDatabaseOptionsFromEnv } from './env';

export function buildDatabaseOptions(input: DatabaseOptionsInput) : DatabaseOptions {
    let permissions : string[] = [];

    if (input.permissions) {
        permissions = Array.isArray(input.permissions) ?
            input.permissions :
            input.permissions.split(',');
    }

    return extendDatabaseOptionsWithDefaults({
        ...input,
        permissions,
    });
}

export function buildDatabaseOptionsFromConfig(config: ConfigInput) : DatabaseOptions {
    return buildDatabaseOptions(
        defu(
            extractDatabaseOptionsFromEnv(),
            config.database || {},
        ),
    );
}
