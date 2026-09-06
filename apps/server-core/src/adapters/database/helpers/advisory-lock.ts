/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
import { InternalError } from '@authup/errors';
import { isObject } from '@authup/kit';
import type { Logger } from '@authup/server-kit';
import type { DataSource, DatabaseType } from 'typeorm';

/**
 * REMOVAL TRIGGER: this is a deliberate local fallback, not a permanent home.
 * The mechanism is dialect knowledge and belongs upstream, next to its exact
 * structural sibling `withForeignKeyChecksDisabled`; proposed as
 * tada5hi/typeorm-extension#1441. When that lands, delete this file and call
 * the library, keeping the spec as the conformance check that it treats
 * mysql's string answer and the sqlite passthrough the way this deployment
 * needs. The one call site is `ProvisionerModule.setup`.
 */

/**
 * A mutex identity. The two dialects address a lock differently, so a lock
 * carries both spellings and the caller owns the values.
 *
 * The two are also not scoped alike, which is confirmed rather than assumed: a
 * postgres advisory lock carries the database OID, so two databases in one
 * cluster do not contend, while a mysql named lock is scoped to the mysqld
 * INSTANCE, so two databases on one server share the lock.
 */
export type DatabaseLock = {
    /** mysql: the `GET_LOCK` name, at most 64 characters. */
    name: string,
    /** postgres: the two int4 keys `pg_try_advisory_lock` takes. */
    key: [number, number]
};

export const DATABASE_LOCK_WAIT_TIMEOUT = 60_000;
export const DATABASE_LOCK_POLL_INTERVAL = 500;

type DatabaseLockStatements = {
    acquire: string,
    release: string,
    parameters: unknown[]
};

/**
 * The statements for a session-scoped advisory lock, or undefined for a driver
 * that has none.
 *
 * The identity is BOUND rather than interpolated, so a lock name never reaches
 * the statement text. Both statements of a dialect take the same parameters.
 *
 * better-sqlite3 falls through deliberately. One database file per container
 * means a second replica cannot reach it, so there is nothing to serialize.
 * `BetterSqlite3Driver.createQueryRunner` also returns ONE shared runner
 * (`this.queryRunner ??= ...`), so holding a runner here would nest inside
 * whatever else is running. Same shape and same reasoning as
 * `isDatabaseTypeRowLockable`.
 */
function statementsFor(type: DatabaseType, lock: DatabaseLock): DatabaseLockStatements | undefined {
    switch (type) {
        case 'postgres':
            return {
                acquire: 'SELECT pg_try_advisory_lock($1, $2) AS acquired',
                release: 'SELECT pg_advisory_unlock($1, $2)',
                parameters: [lock.key[0], lock.key[1]],
            };
        case 'mysql':
            return {
                acquire: 'SELECT GET_LOCK(?, 0) AS acquired',
                release: 'SELECT RELEASE_LOCK(?)',
                parameters: [lock.name],
            };
        default:
            return undefined;
    }
}

/**
 * Whether the try-lock reports success.
 *
 * postgres answers with a JS boolean, mysql2 with the string `'1'` (or the
 * number 1), and mysql answers NULL on error. A truthiness check would read
 * mysql's `'0'` (a lock held by another session) as acquired.
 */
function isAcquired(rows: unknown): boolean {
    const row = Array.isArray(rows) ? rows[0] : undefined;
    if (!isObject(row)) {
        return false;
    }

    const value = (row as Record<string, unknown>).acquired;
    return value === true || value === 1 || value === '1';
}

export type DatabaseLockOptions = {
    logger?: Logger,
    /** Total time to wait for the lock before giving up. */
    waitTimeout?: number,
    /** Delay between try-lock attempts. */
    pollInterval?: number,
    /** Test seam. */
    wait?: (ms: number) => Promise<void>
};

/**
 * Run `fn` while holding a database-wide advisory lock, for work that must not
 * run on two connections at once.
 *
 * Three mechanics are load-bearing, and each is a way this can be broken
 * without any visible symptom:
 *
 * - The lock is SESSION-scoped in both dialects, so it takes a dedicated query
 *   runner for its whole lifetime. `dataSource.query()` would acquire and
 *   release on different pooled connections.
 * - It is COUNTED in both, so it is acquired exactly once.
 * - It is released explicitly before the runner goes back to the pool. Skipping
 *   that leaks the lock onto a pooled connection for the lifetime of the
 *   process, and the next call in that process deadlocks against itself.
 *
 * On timeout this THROWS rather than running `fn` unlocked, so a caller that
 * cannot tolerate an unserialized run does not silently get one.
 */
export async function withDatabaseLock<R>(
    dataSource: DataSource,
    lock: DatabaseLock,
    fn: () => Promise<R>,
    options: DatabaseLockOptions = {},
): Promise<R> {
    const statements = statementsFor(dataSource.options.type, lock);
    if (!statements) {
        return fn();
    }

    const waitTimeout = options.waitTimeout ?? DATABASE_LOCK_WAIT_TIMEOUT;
    const pollInterval = options.pollInterval ?? DATABASE_LOCK_POLL_INTERVAL;
    const wait = options.wait ?? ((ms: number) => new Promise<void>((resolve) => {
        setTimeout(resolve, ms);
    }));

    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();

    let acquired = false;

    try {
        // The elapsed budget is counted in poll intervals rather than read off
        // the clock, so an injected `wait` makes the timeout branch instant.
        // A real wait therefore over-runs the budget by the round-trip time of
        // each attempt, which is the right direction to be wrong in.
        let waited = 0;

        for (;;) {
            acquired = isAcquired(await queryRunner.query(statements.acquire, statements.parameters));
            if (acquired) {
                break;
            }

            if (waited >= waitTimeout) {
                throw new InternalError(
                    `Timed out after ${waitTimeout}ms waiting for the database lock "${lock.name}". ` +
                    'Another process holds it.',
                );
            }

            if (waited === 0) {
                options.logger?.info(`Another process holds the database lock "${lock.name}". Waiting for it to finish.`);
            }

            await wait(pollInterval);
            waited += pollInterval;
        }

        return await fn();
    } finally {
        if (acquired) {
            try {
                await queryRunner.query(statements.release, statements.parameters);
            } catch {
                // A leaked lock self-releases when the session ends, so this
                // must never displace whatever the caller is already throwing.
                options.logger?.warn(`Could not release the database lock "${lock.name}".`);
            }
        }

        await queryRunner.release();
    }
}
