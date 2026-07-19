/*
 * Copyright (c) 2024-2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    ApplicationBuilder,
    ConfigModule,
} from '../../src/index.ts';
import type { Config } from '../../src/index.ts';
import { normalizeConfig } from '../../src/app/modules/config/normalize.ts';
import { readConfigRawFromEnv } from '../../src/app/modules/config/read/index.ts';

import { TestApplication } from './module.ts';
import { TestHTTPApplication } from './http.ts';
import { createTestDatabaseModuleForSuite } from './database.ts';

async function buildTestConfig(alter?: (config: Config) => void): Promise<Config> {
    const raw = readConfigRawFromEnv();
    const config = await normalizeConfig(raw);

    config.port = 0;
    config.middlewareRateLimit = false;
    config.middlewarePrometheus = false;
    config.middlewareSwagger = false;

    config.userAdminEnabled = true;
    config.userAuthBasic = true;

    config.redis = false;

    config.registrationEnabled = true;
    config.emailVerificationEnabled = true;
    config.passwordRecoveryEnabled = true;

    if (alter) {
        alter(config);
    }

    return config;
}

export type TestApplicationOptions = {
    config?: (config: Config) => void,
};

export function createTestApplication(options: TestApplicationOptions = {}) : TestHTTPApplication {
    const modules = new ApplicationBuilder()
        .withConfig(new ConfigModule(() => buildTestConfig(options.config)))
        .withLogger()
        .withCache()
        .withLdap()
        .withMail()
        .withDatabase(createTestDatabaseModuleForSuite())
        .withAuthentication()
        .withIdentity()
        .withOAuth2()
        .withHTTP()
        .buildModules();

    return new TestHTTPApplication({ modules });
}

export function createTestDatabaseApplication() : TestApplication {
    const modules = new ApplicationBuilder()
        .withConfig(new ConfigModule(buildTestConfig))
        .withLogger()
        .withDatabase(createTestDatabaseModuleForSuite())
        .buildModules();

    return new TestApplication({ modules });
}
