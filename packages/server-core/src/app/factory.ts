/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Application } from './module.ts';
import {
    AuthenticationModule,
    CacheModule,
    ComponentsModule,
    ConfigModule,
    DatabaseModule,
    HTTPModule,
    IdentityModule,
    LdapModule,
    LoggerModule,
    MailModule,
    OAuth2Module,
    RuntimeModule,
    SwaggerModule,
    VaultModule,
} from './modules/index.ts';
import { ProvisionerModule } from './modules/provisioning/module.ts';

export function createApplication() {
    return new Application([
        new ConfigModule(),
        new LoggerModule(),

        // todo: rename to CacheModule
        new CacheModule(),

        // todo: rename to mail module
        new MailModule(),

        new VaultModule(),

        new RuntimeModule(),

        new SwaggerModule(),
        new DatabaseModule(),
        new ProvisionerModule(),
        new LdapModule(),

        new AuthenticationModule(),
        new IdentityModule(),
        new OAuth2Module(),

        new ComponentsModule(),

        new HTTPModule(),
    ]);
}
