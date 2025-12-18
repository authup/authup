/*
 * Copyright (c) 2024-2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    CacheModule,
    ConfigModule,
    HTTPModule,
    IdentityModule,
    LdapModule,
    LoggerModule,
    MailModule,
    OAuth2Module,
} from '../../src';
import { normalizeConfig } from '../../src/app/modules/config/normalize';
import { readConfigRawFromEnv } from '../../src/app/modules/config/read';

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

    config.registration = true;
    config.emailVerification = true;

    return new TestApplication([
        new ConfigModule(config),
        new LoggerModule(),
        new CacheModule(),
        new LdapModule(),
        new MailModule(),

        new TestDatabaseModule(),
        new IdentityModule(),
        new OAuth2Module(),

        new HTTPModule(),
    ]);
}
