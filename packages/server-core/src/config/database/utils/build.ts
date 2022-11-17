/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { merge } from 'smob';
import { DatabaseOptions, DatabaseOptionsInput } from '../type';
import { extendDatabaseOptionsWithDefaults } from './defaults';
import { extractDatabaseOptionsFromEnv } from './env';
import { validateDatabaseOptionsInput } from './validate';

export function buildDatabaseOptions(options?: DatabaseOptionsInput) : DatabaseOptions {
    const input = validateDatabaseOptionsInput(
        merge(
            extractDatabaseOptionsFromEnv(),
            options || {},
        ),
    );

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
