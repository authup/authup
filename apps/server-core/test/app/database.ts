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
import {
    ConfigInjectionKey, DatabaseModule,
} from '../../src';
import type { IContainer } from 'eldin';
import { PACKAGE_PATH } from '../../src/path.ts';

async function resolveDataSourceOptions(container: IContainer) {
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
            database: path.join(PACKAGE_PATH, 'writable', 'test.sql'),
        };
    }

    container.register(ConfigInjectionKey, {
        useValue: config,
    });
}

export function createTestDatabaseModuleForSetup(): DatabaseModule {
    return new DatabaseModule({
        prepareBuild: resolveDataSourceOptions,
        async setup(_container, options) {
            if (typeof options.database === 'string') {
                fs.rmSync(options.database, { force: true });
                fs.mkdirSync(path.dirname(options.database), { recursive: true });
            } else {
                await dropDatabase({ options, ifExist: true });
            }

            await createDatabase({ options, synchronize: false, ifNotExist: true });
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

            await resolveDataSourceOptions(container);
        },
        async setup() {
            // do nothing — DB already exists from global setup
        },
        async migrate(_container, dataSource) {
            await dataSource.synchronize();
        },
    });
}
