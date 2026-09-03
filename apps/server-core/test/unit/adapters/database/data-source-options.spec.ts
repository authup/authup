/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import { AuthupError } from '@authup/errors';
import { Container } from 'eldin';
import type { DataSourceOptions } from 'typeorm';
import { resetEnv } from 'typeorm-extension';
import { DataSourceOptionsBuilder } from '../../../../src/adapters/database/data-source/options/module.ts';
import { ConfigInjectionKey } from '../../../../src/app/modules/config/index.ts';
import { normalizeConfig } from '../../../../src/app/modules/config/read.ts';
import { DatabaseModule } from '../../../../src/app/modules/database/index.ts';

// buildDataSourceOptions is protected, and it is the one line that decides
// which of the two builder methods the boot path takes. Without this the
// wiring is unpinned: swapping it back to the strict method leaves every
// other case in this file green.
class ProbeDatabaseModule extends DatabaseModule {
    build(container: Container) : Promise<DataSourceOptions> {
        return this.buildDataSourceOptions(container);
    }
}

const isDatabaseEnvKey = (key: string) => key.startsWith('DB_') || key.startsWith('TYPEORM_');

// typeorm-extension memoizes its environment read, so every case has to reset
// it after changing process.env. The test:mysql / test:psql runs set DB_TYPE
// for the whole process, which is why the no-database case clears the keys
// instead of merely leaving them alone.
function withDatabaseEnv<T>(env: Record<string, string>, fn: () => T) : T {
    const previous : Record<string, string | undefined> = Object.fromEntries(
        Object.keys(process.env)
            .filter((key) => isDatabaseEnvKey(key))
            .map((key) => [key, process.env[key]]),
    );

    for (const key of Object.keys(previous)) {
        delete process.env[key];
    }

    Object.assign(process.env, env);
    resetEnv();

    try {
        return fn();
    } finally {
        for (const key of Object.keys(process.env)) {
            if (isDatabaseEnvKey(key)) {
                delete process.env[key];
            }
        }

        Object.assign(process.env, previous);
        resetEnv();
    }
}

describe('adapters/database/data-source/options', () => {
    it('should fall back to the better-sqlite3 driver when no database is configured', () => {
        const options = withDatabaseEnv({}, () => new DataSourceOptionsBuilder().buildWithEnvOrDefault());

        expect(options.type).toEqual('better-sqlite3');
        expect((options as { database?: string }).database).toEqual('db.sqlite');
    });

    it('should refuse a half-written configuration rather than falling back', () => {
        withDatabaseEnv({ DB_HOST: '127.0.0.1', DB_DATABASE: 'app' }, () => {
            expect(() => new DataSourceOptionsBuilder().buildWithEnvOrDefault()).toThrow(AuthupError);
        });
    });

    it('should refuse it under the TYPEORM_ aliases as well', () => {
        withDatabaseEnv({ TYPEORM_HOST: '127.0.0.1' }, () => {
            expect(() => new DataSourceOptionsBuilder().buildWithEnvOrDefault()).toThrow(AuthupError);
        });
    });

    it('should keep a configured database type over the fallback', () => {
        const options = withDatabaseEnv({ DB_TYPE: 'postgres' }, () => new DataSourceOptionsBuilder().buildWithEnvOrDefault());

        expect(options.type).toEqual('postgres');
    });

    it('should apply the fallback on the boot path when no database is configured', async () => {
        const config = await normalizeConfig({ env: 'development' });

        const container = new Container();
        container.register(ConfigInjectionKey, { useValue: config });

        const options = await withDatabaseEnv({}, () => new ProbeDatabaseModule().build(container));

        expect(options.type).toEqual('better-sqlite3');
    });

    it('should still throw on the strict read when no database is configured', () => {
        withDatabaseEnv({}, () => {
            expect(() => new DataSourceOptionsBuilder().buildWithEnv()).toThrow(AuthupError);
        });
    });
});
