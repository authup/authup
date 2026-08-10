/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { EnvironmentName } from '@authup/kit';
import { createDatabase, dropDatabase, readDataSourceOptionsFromEnv } from 'typeorm-extension';
import fs from 'node:fs';
import path from 'node:path';
import { inject } from 'vitest';
import { ConfigInjectionKey, DatabaseModule } from '../../src';
import type { IContainer } from 'eldin';
import { PACKAGE_PATH } from '../../src/path.ts';

const DATABASE_DIRECTORY_PATH = path.join(PACKAGE_PATH, 'writable');
const TEMPLATE_DATABASE_PATH = path.join(DATABASE_DIRECTORY_PATH, 'test.sql');
const WORKER_DATABASE_REGEX = /^test-\d+\.sql$/;

// Spec files run in parallel worker processes, so every worker gets its own
// copy of the provisioned template database. VITEST_POOL_ID is stable per
// pool slot: two concurrently-running files never share it, while files that
// reuse a slot sequentially share the copy (the pre-existing single-file
// semantics, minus the cross-worker races).
function buildWorkerDatabasePath(): string {
    return path.join(DATABASE_DIRECTORY_PATH, `test-${process.env.VITEST_POOL_ID || '0'}.sql`);
}

async function resolveDataSourceOptions(container: IContainer, database: string) {
    const config = container.resolve(ConfigInjectionKey);

    if (config.env !== EnvironmentName.TEST) {
        throw new Error('Test database module can only run with EnvironmentName.TEST');
    }

    const options = readDataSourceOptionsFromEnv();
    if (options) {
        config.db = options;
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

export function createTestDatabaseModuleForSuite(): DatabaseModule {
    return new DatabaseModule({
        async prepareBuild(container: IContainer) {
            const connection = inject('DATABASE_CONNECTION');
            if (connection) {
                process.env.DB_TYPE = connection.type;
                process.env.DB_HOST = connection.host;
                process.env.DB_PORT = connection.port;
                process.env.DB_USERNAME = connection.username;
                process.env.DB_PASSWORD = connection.password;
                process.env.DB_DATABASE = connection.database;
            }

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
