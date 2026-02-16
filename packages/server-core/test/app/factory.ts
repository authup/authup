/*
 * Copyright (c) 2024-2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    AuthenticationModule,
    CacheModule,
    ConfigModule,
    HTTPModule,
    IdentityModule,
    LdapModule,
    LoggerModule,
    MailModule,
    OAuth2Module, ProvisionerModule,
} from '../../src/index.ts';
import { normalizeConfig } from '../../src/app/modules/config/normalize.ts';
import { readConfigRawFromEnv } from '../../src/app/modules/config/read/index.ts';

import { TestApplication } from './module.ts';
import { TestDatabaseModule } from './database.ts';

export function createTestApplication() : TestApplication {
    const raw = readConfigRawFromEnv();
    const config = normalizeConfig(raw);

    config.port = 0;
    config.middlewareRateLimit = false;
    config.middlewarePrometheus = false;
    config.middlewareSwagger = false;

    config.userAdminEnabled = true;
    config.userAuthBasic = true;

    config.robotAdminEnabled = true;

    config.redis = false;
    config.vault = false;

    config.registration = true;
    config.emailVerification = true;

    return new TestApplication([
        new ConfigModule(config),
        new LoggerModule(),
        new CacheModule(),
        new LdapModule(),
        new MailModule(),

        new TestDatabaseModule(),
        new ProvisionerModule(),
        new AuthenticationModule(),
        new IdentityModule(),
        new OAuth2Module(),

        new HTTPModule(),
    ]);
}
