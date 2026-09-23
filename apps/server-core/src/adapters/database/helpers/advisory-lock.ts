/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
import type { DataSource, DatabaseType } from 'typeorm';
import { withDatabaseLock as withQueryRunnerLock } from 'typeorm-extension';

export const DATABASE_LOCK_WAIT_TIMEOUT = 60_000;

export type DatabaseLockOptions = {
    /** Total time to wait for the lock before giving up. */
    timeout?: number,
};

/**
 * Whether the driver takes an advisory lock at all.
 *
 * better-sqlite3 does not, deliberately: one database file per container means
 * a second replica cannot reach it, so there is nothing to serialize. It is
 * also checked BEFORE a runner is created, because
 * `BetterSqlite3Driver.createQueryRunner` returns ONE shared runner
 * (`this.queryRunner ??= ...`), so holding a runner here would nest inside
 * whatever else is running. Same shape and reasoning as
 * `isDatabaseTypeRowLockable`.
 */
function isDatabaseTypeLockable(type: DatabaseType): boolean {
    return type === 'postgres' || type === 'mysql';
}

/**
 * Run `fn` while holding a database-wide advisory lock named `name`, for work
 * that must not run on two connections at once.
 *
 * The lock itself is typeorm-extension's `withDatabaseLock`. What this adds is
 * the runner lifecycle: the lock is SESSION-scoped, so it takes a dedicated
 * query runner for its whole lifetime, released back to the pool afterwards.
 * `fn` runs its own queries on other pooled connections.
 *
 * On timeout this THROWS a `DatabaseLockError` rather than running `fn`
 * unlocked, so a caller that cannot tolerate an unserialized run does not
 * silently get one.
 */
export async function withDatabaseLock<R>(
    dataSource: DataSource,
    name: string,
    fn: () => Promise<R>,
    options: DatabaseLockOptions = {},
): Promise<R> {
    if (!isDatabaseTypeLockable(dataSource.options.type)) {
        return fn();
    }

    const queryRunner = dataSource.createQueryRunner();
    try {
        return await withQueryRunnerLock(queryRunner, name, fn, { timeout: options.timeout ?? DATABASE_LOCK_WAIT_TIMEOUT });
    } finally {
        await queryRunner.release();
    }
}
