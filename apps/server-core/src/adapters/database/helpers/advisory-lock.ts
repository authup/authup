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
 * The mutex identity. Arbitrary, but it must stay STABLE across releases: a
 * changed key is a different mutex, so during a rolling deploy the outgoing
 * and the incoming replica would each hold their own and provision at once.
 *
 * postgres takes two int4 keys, mysql one string of at most 64 characters.
 *
 * The two are not scoped alike, which is confirmed rather than assumed: a
 * postgres advisory lock carries the database OID, so two databases in one
 * cluster do not contend, while a mysql named lock is scoped to the mysqld
 * INSTANCE, so two authup databases on one server share this mutex. That is
 * left as it is. The consequence is that one deployment's first boot delays
 * the other's rather than corrupting it, and both are bounded by the wait
 * budget below.
 */
const LOCK_KEY_NAMESPACE = 16725;
const LOCK_KEY_ID = 1;
const LOCK_NAME = 'authup:provisioning';

export const PROVISIONING_LOCK_WAIT_TIMEOUT = 60_000;
export const PROVISIONING_LOCK_POLL_INTERVAL = 500;

type AdvisoryLockStatements = {
    acquire: string,
    release: string
};

/**
 * The statements for a session-scoped advisory lock, or undefined for a driver
 * that has none.
 *
 * The keys are inlined rather than bound, so the two dialects' placeholder
 * syntaxes never enter the picture; both values are compile-time constants.
 *
 * better-sqlite3 falls through deliberately. One database file per container
 * means a second replica cannot reach it, so there is nothing to serialize.
 * `BetterSqlite3Driver.createQueryRunner` also returns ONE shared runner
 * (`this.queryRunner ??= ...`), so holding a runner here would nest inside
 * whatever else is running. Same shape and same reasoning as
 * `isDatabaseTypeRowLockable`.
 */
function statementsFor(type: DatabaseType): AdvisoryLockStatements | undefined {
    switch (type) {
        case 'postgres':
            return {
                acquire: `SELECT pg_try_advisory_lock(${LOCK_KEY_NAMESPACE}, ${LOCK_KEY_ID}) AS acquired`,
                release: `SELECT pg_advisory_unlock(${LOCK_KEY_NAMESPACE}, ${LOCK_KEY_ID})`,
            };
        case 'mysql':
            return {
                acquire: `SELECT GET_LOCK('${LOCK_NAME}', 0) AS acquired`,
                release: `SELECT RELEASE_LOCK('${LOCK_NAME}')`,
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

export type ProvisioningLockOptions = {
    logger?: Logger,
    /** Total time to wait for the lock before giving up. */
    waitTimeout?: number,
    /** Delay between try-lock attempts. */
    pollInterval?: number,
    /** Test seam. */
    wait?: (ms: number) => Promise<void>
};

/**
 * Run `fn` while holding the deployment-wide provisioning mutex.
 *
 * Provisioning is a reconciliation pass built out of find-then-insert pairs
 * with no guard between the two statements, so two replicas booting against an
 * unprovisioned database interleave. One mutex around the whole pass is what
 * closes that, rather than a guard per write site, and it is the only shape
 * that closes BOTH halves of the failure. Half the tables carry a unique key
 * that raises on the loser (`auth_realms`, `auth_clients`, `auth_users`, every
 * junction), and half carry one that cannot: `auth_permissions`,
 * `auth_roles`, `auth_scopes` and `auth_policies` are unique over a tuple
 * containing a NULLABLE column, and every row the default source declares for
 * them is global, so the duplicates are simply written and nothing raises. A
 * duplicate-key guard is unreachable there by construction (issue #3356).
 *
 * The lock is SESSION-scoped in both dialects, so it needs a dedicated query
 * runner for its whole lifetime: `dataSource.query()` would acquire and
 * release on different pooled connections. It is also COUNTED in both, so it
 * is acquired exactly once. Not releasing it explicitly would leak it onto a
 * pooled connection for the lifetime of the process, and a second `setup()`
 * in the same process would then deadlock against itself.
 *
 * On timeout this THROWS rather than proceeding unlocked. Proceeding is the
 * pre-fix behaviour, which is the thing being removed; failing the boot is
 * what today's losing replica does anyway, and the deployment already restarts
 * it, by which point the winner has finished and the pass is a no-op.
 */
export async function withProvisioningLock<R>(
    dataSource: DataSource,
    fn: () => Promise<R>,
    options: ProvisioningLockOptions = {},
): Promise<R> {
    const statements = statementsFor(dataSource.options.type);
    if (!statements) {
        return fn();
    }

    const waitTimeout = options.waitTimeout ?? PROVISIONING_LOCK_WAIT_TIMEOUT;
    const pollInterval = options.pollInterval ?? PROVISIONING_LOCK_POLL_INTERVAL;
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
            acquired = isAcquired(await queryRunner.query(statements.acquire));
            if (acquired) {
                break;
            }

            if (waited >= waitTimeout) {
                throw new InternalError(
                    `Timed out after ${waitTimeout}ms waiting for the provisioning lock. ` +
                    'Another replica is provisioning this database; this one will reconcile on restart.',
                );
            }

            if (waited === 0) {
                options.logger?.info('Another replica holds the provisioning lock. Waiting for it to finish.');
            }

            await wait(pollInterval);
            waited += pollInterval;
        }

        return await fn();
    } finally {
        if (acquired) {
            try {
                await queryRunner.query(statements.release);
            } catch {
                // A leaked lock self-releases when the session ends, so this
                // must never displace whatever the caller is already throwing.
                options.logger?.warn('Could not release the provisioning lock.');
            }
        }

        await queryRunner.release();
    }
}
