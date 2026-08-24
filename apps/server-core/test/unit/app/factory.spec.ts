/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createNoopLogger } from '@authup/server-kit';
import type { Logger } from '@authup/server-kit';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { ModuleStatus } from 'orkos';
import { describe, expect, it } from 'vitest';
import {
    ConfigModule,
    DatabaseInjectionKey,
    LoggerInjectionKey,
    ModuleName,
    createWorkerApplication,
} from '../../../src/app';
import type { Config } from '../../../src/app';
import { normalizeConfig } from '../../../src/app/modules/config/normalize';
import { PACKAGE_PATH } from '../../../src/path';

// The worker preset builds its own DatabaseModule, so the suite's database
// module cannot be injected: the connection is steered through the config
// instead. It is pinned to sqlite on every dialect the suite runs on, which
// is also the shape the migrate override has to fall through on (no
// migrations configured, so the schema still has to be created).
const DATABASE_PATH = path.join(
    PACKAGE_PATH,
    'writable',
    `test-worker-${process.env.VITEST_POOL_ID || '0'}.sql`,
);

async function buildWorkerConfig(): Promise<Config> {
    const config = await normalizeConfig({
        componentsEnabled: false,
        eventLogEnabled: false,
    });

    config.redis = false;
    config.db = {
        type: 'better-sqlite3',
        database: DATABASE_PATH,
    };

    return config;
}

function createRecordingLogger() {
    const lines : string[] = [];

    const logger = createNoopLogger();
    const record = ((message: unknown) => {
        lines.push(String(message));

        return logger;
    }) as Logger['info'];

    logger.info = record;
    logger.debug = record as Logger['debug'];

    return {
        logger,
        lines,
    };
}

describe('app/factory', () => {
    it('should compose the worker application from the background modules only', () => {
        const app = createWorkerApplication({ config: new ConfigModule(buildWorkerConfig) });

        const names = [...app.getStatus().keys()];

        expect(names).toEqual([
            ModuleName.CONFIG,
            ModuleName.LOGGER,
            ModuleName.CACHE,
            ModuleName.DATABASE,
            ModuleName.COMPONENTS,
        ]);

        // nothing that serves a request, and nothing that writes the
        // provisioning graph.
        expect(names).not.toContain(ModuleName.HTTP);
        expect(names).not.toContain(ModuleName.PROVISIONING);
        expect(names).not.toContain(ModuleName.MAIL);
        expect(names).not.toContain(ModuleName.OAUTH2);
        expect(names).not.toContain(ModuleName.IDENTITY);
    });

    it('should set up and tear down over a sqlite database', async () => {
        fs.mkdirSync(path.dirname(DATABASE_PATH), { recursive: true });
        fs.rmSync(DATABASE_PATH, { force: true });

        const { logger, lines } = createRecordingLogger();

        const app = createWorkerApplication({ config: new ConfigModule(buildWorkerConfig) });
        app.container.register(LoggerInjectionKey, { useValue: logger });

        await app.setup();

        try {
            expect(app.getModuleStatus(ModuleName.DATABASE)).toEqual(ModuleStatus.Ready);
            expect(app.getModuleStatus(ModuleName.COMPONENTS)).toEqual(ModuleStatus.Ready);

            // the worker applies no migrations, and the sqlite options carry
            // none, so the schema must still have been created.
            const dataSource = app.container.resolve(DatabaseInjectionKey.DataSource);
            const queryRunner = dataSource.createQueryRunner();
            try {
                expect(await queryRunner.hasTable('auth_realms')).toBeTruthy();
            } finally {
                await queryRunner.release();
            }

            // the components are forced on, so they must not report
            // themselves off despite componentsEnabled: false.
            expect(lines).not.toContain('Background components are disabled by configuration.');
        } finally {
            await app.teardown();
        }

        expect(app.getModuleStatus(ModuleName.DATABASE)).toEqual(ModuleStatus.TornDown);
        expect(app.container.tryResolve(DatabaseInjectionKey.DataSource).success).toBeFalsy();
    });
});
