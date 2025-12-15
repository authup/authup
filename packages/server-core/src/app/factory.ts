/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { DependencyContainer } from '../core';
import { Application } from './module';
import {
    DatabaseModule,
    HTTPModule,
    IdentityModule,
    RuntimeModule, SwaggerModule,
} from './modules';
import { LdapModule } from './modules/ldap';
import { OAuth2Module } from './modules/oauth2/module';

export function createApplication(container: DependencyContainer) {
    return new Application(container, [
        new RuntimeModule(container),
        new SwaggerModule(container),

        new DatabaseModule(container),
        new LdapModule(container),

        new IdentityModule(container),
        new OAuth2Module(container),

        new HTTPModule(container),
    ]);
}
