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
        return type !== 'better-sqlite3';
    }

    return true;
}

/**
 * Whether the driver supports row-level pessimistic locks (`FOR UPDATE`).
 * better-sqlite3 does not (and needs none — a write transaction already
 * serializes writers database-wide), so a `setLock('pessimistic_write')`
 * would throw `LockNotSupportedOnGivenDriverError` there.
 */
export function isDatabaseTypeRowLockable(type: DatabaseType) : boolean {
    return type === 'mysql' || type === 'postgres';
}
