/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { EnvironmentName } from '@authup/kit';
import type { DatabaseConnectionOptions } from '@authup/server-config';
import { createDatabase, dropDatabase, readDataSourceOptionsFromEnv } from 'typeorm-extension';
import fs from 'node:fs';
import path from 'node:path';
import { inject } from 'vitest';
import { ConfigInjectionKey, DatabaseModule } from '../../src';
import type { IContainer } from 'eldin';
import { PACKAGE_PATH } from '../../src/path.ts';

const DATABASE_DIRECTORY_PATH = path.join(PACKAGE_PATH, 'writable');
const TEMPLATE_DATABASE_PATH = path.join(DATABASE_DIRECTORY_PATH, 'test.sql');
// `test-<pool>.sql` (a worker database) and `test-<name>-<pool>.sql` (a
// secondary instance's database, see below).
const WORKER_DATABASE_REGEX = /^test-(?:[a-z0-9-]+-)?\d+\.sql$/;

// Spec files run in parallel worker processes, so every worker gets its own
// copy of the provisioned template database. VITEST_POOL_ID is stable per
// pool slot: two concurrently-running files never share it, while files that
// reuse a slot sequentially share the copy (the pre-existing single-file
// semantics, minus the cross-worker races).
function buildWorkerDatabasePath(): string {
    return path.join(DATABASE_DIRECTORY_PATH, `test-${process.env.VITEST_POOL_ID || '0'}.sql`);
}

// A spec that boots a SECOND application needs a second database, and it must
// be one the run's own dialect can serve: an instance pinned to sqlite inside a
// mysql/postgres run has no provisioned template to start from.
function buildSecondaryDatabasePath(name: string): string {
    return path.join(DATABASE_DIRECTORY_PATH, `test-${name}-${process.env.VITEST_POOL_ID || '0'}.sql`);
}

function buildSecondaryDatabaseName(name: string, database: unknown): string {
    const base = typeof database === 'string' && database.length > 0 ? database : 'app';
    return `${base}_${name}_${process.env.VITEST_POOL_ID || '0'}`;
}

function applyDatabaseConnectionEnv() {
    const connection = inject('DATABASE_CONNECTION');
    if (!connection) {
        return;
    }

    process.env.DB_TYPE = connection.type;
    process.env.DB_HOST = connection.host;
    process.env.DB_PORT = connection.port;
    process.env.DB_USERNAME = connection.username;
    process.env.DB_PASSWORD = connection.password;
    process.env.DB_DATABASE = connection.database;
}

async function resolveDataSourceOptions(container: IContainer, database: string) {
    const config = container.resolve(ConfigInjectionKey);

    if (config.env !== EnvironmentName.TEST) {
        throw new Error('Test database module can only run with EnvironmentName.TEST');
    }

    const options = readDataSourceOptionsFromEnv();
    if (options) {
        // the configuration surface is deliberately untyped: `db` is authup's
        // own loose shape and carries only the three supported dialects.
        config.db = options as DatabaseConnectionOptions;
    } else {
        config.db = {
            type: 'better-sqlite3',
            database,
        };
    }

    container.register(ConfigInjectionKey, { useValue: config });
}

export function createTestDatabaseModuleForSetup(): DatabaseModule {
    return new DatabaseModule({
        prepareBuild: (container) => resolveDataSourceOptions(container, TEMPLATE_DATABASE_PATH),
        async setup(_container, options) {
            if (options.type === 'better-sqlite3' && typeof options.database === 'string') {
                fs.rmSync(options.database, { force: true });
                fs.mkdirSync(path.dirname(options.database), { recursive: true });

                const entries = fs.readdirSync(DATABASE_DIRECTORY_PATH);
                for (const entry of entries) {
                    if (WORKER_DATABASE_REGEX.test(entry)) {
                        fs.rmSync(path.join(DATABASE_DIRECTORY_PATH, entry), { force: true });
                    }
                }
            } else {
                await dropDatabase({
                    options,
                    ifExist: true,
                });
            }

            await createDatabase({
                options,
                synchronize: false,
                ifNotExist: true,
            });
        },
        async migrate(_container, dataSource) {
            await dataSource.synchronize();
        },
    });
}

/**
 * An empty database for a SECOND application booted inside one spec, on the
 * dialect the run itself uses: a file next to the worker database on sqlite, a
 * dedicated database on the server otherwise.
 *
 * It carries no provisioned rows (the template database belongs to the suite
 * instance), so the caller must run its own `withProvisioning(...)`.
 */
export function createTestDatabaseModuleForSecondaryInstance(name: string): DatabaseModule {
    return new DatabaseModule({
        async prepareBuild(container: IContainer) {
            applyDatabaseConnectionEnv();

            const config = container.resolve(ConfigInjectionKey);
            if (config.env !== EnvironmentName.TEST) {
                throw new Error('Test database module can only run with EnvironmentName.TEST');
            }

            const options = readDataSourceOptionsFromEnv();
            if (options) {
                config.db = {
                    ...options,
                    database: buildSecondaryDatabaseName(name, options.database),
                } as DatabaseConnectionOptions;
            } else {
                config.db = {
                    type: 'better-sqlite3',
                    database: buildSecondaryDatabasePath(name),
                };
            }

            container.register(ConfigInjectionKey, { useValue: config });
        },
        async setup(_container, options) {
            if (options.type === 'better-sqlite3' && typeof options.database === 'string') {
                fs.rmSync(options.database, { force: true });
                fs.mkdirSync(path.dirname(options.database), { recursive: true });
            } else {
                await dropDatabase({
                    options,
                    ifExist: true,
                });
            }

            await createDatabase({
                options,
                synchronize: false,
                ifNotExist: true,
            });
        },
        async migrate(_container, dataSource) {
            await dataSource.synchronize();
        },
    });
}

export function createTestDatabaseModuleForSuite(): DatabaseModule {
    return new DatabaseModule({
        async prepareBuild(container: IContainer) {
            applyDatabaseConnectionEnv();

            await resolveDataSourceOptions(container, buildWorkerDatabasePath());
        },
        async setup(_container, options) {
            if (options.type !== 'better-sqlite3' || typeof options.database !== 'string') {
                return;
            }

            if (fs.existsSync(options.database)) {
                return;
            }

            if (!fs.existsSync(TEMPLATE_DATABASE_PATH)) {
                throw new Error(
                    `The provisioned template database is missing (${TEMPLATE_DATABASE_PATH}). ` +
                    'Run the suite via "npm run test --workspace=apps/server-core" ' +
                    '(or "npx vitest run --config test/vitest.config.ts") so the global setup creates it.',
                );
            }

            fs.mkdirSync(path.dirname(options.database), { recursive: true });
            fs.copyFileSync(TEMPLATE_DATABASE_PATH, options.database);
        },
        async migrate(_container, dataSource) {
            await dataSource.synchronize();
        },
    });
}
