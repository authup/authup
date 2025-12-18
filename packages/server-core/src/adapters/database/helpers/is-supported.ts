/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
import type { DatabaseType } from 'typeorm';
import { EnvironmentName } from '@authup/kit';

export function isDatabaseTypeSupported(type: DatabaseType) : boolean {
    return type === 'mysql' ||
        type === 'postgres' ||
        type === 'better-sqlite3';
}

export function isDatabaseTypeSupportedForEnvironment(type: DatabaseType, env: string) : boolean {
    if (env === EnvironmentName.PRODUCTION) {
        return type !== 'better-sqlite3' && type !== 'sqlite';
    }

    return true;
}
