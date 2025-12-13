/*
 * Copyright (c) 2024-2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { useLogger } from '@authup/server-kit';
import {
    applyConfig, normalizeConfig, readConfigRawFromEnv, setConfig,
} from '../../src';
import { DIModule, HTTPModule, ModuleContextContainer } from '../../src/app';
import { TestApplication } from './module';
import { TestDatabaseModule } from './database';

export function createTestApplication() : TestApplication {
    const raw = readConfigRawFromEnv();
    const config = normalizeConfig(raw);

    config.env = 'test';
    config.middlewareRateLimit = false;
    config.middlewarePrometheus = false;
    config.middlewareSwagger = false;

    config.userAdminEnabled = true;
    config.userAuthBasic = true;

    config.robotAdminEnabled = true;

    config.redis = false;
    config.vault = false;

    setConfig(config);
    applyConfig(config);

    const container = new ModuleContextContainer();
    container.register('config', config);
    container.register('logger', useLogger());

    return new TestApplication(container, [
        new TestDatabaseModule(container),
        new DIModule(container),
        new HTTPModule(container),
    ]);
}
