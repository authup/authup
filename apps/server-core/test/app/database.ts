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
import {
    type Config, ConfigInjectionKey, DatabaseModule,
} from '../../src';
import type { IDIContainer } from '../../src/core';
import { PACKAGE_PATH } from '../../src/path.ts';

async function prepareTestBuild(container: IDIContainer): Promise<void> {
    const config = container.resolve<Config>(ConfigInjectionKey);

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
        prepareBuild: prepareTestBuild,
        async setup(_container, options) {
            await dropDatabase({ options, ifExist: true });

            if (typeof options.database === 'string') {
                fs.mkdirSync(path.dirname(options.database), { recursive: true });
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
        prepareBuild: prepareTestBuild,
        async setup() {
            // do nothing — DB already exists from global setup
        },
        async migrate(_container, dataSource) {
            await dataSource.synchronize();
        },
    });
}
