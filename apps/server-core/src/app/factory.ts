/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IContainer } from 'eldin';
import type { DataSource } from 'typeorm';
import { ApplicationBuilder } from './builder.ts';
import {
    ComponentsModule,
    DatabaseModule,
    DefaultProvisioningSource,
    HTTPModule,
    LoggerInjectionKey,
    ProvisionerModule,
    verifySchemaOrSynchronize,
} from './modules/index.ts';
import type { CreateApplicationContext } from './types.ts';

export function createApplication(context: CreateApplicationContext = {}) {
    return new ApplicationBuilder()
        .withConfig(context.config)
        .withLogger()
        .withCache()
        .withMail()
        .withRuntime()
        .withDatabase()
        .withProvisioning(new ProvisionerModule([
            new DefaultProvisioningSource(),
        ]))
        .withLdap()
        .withAuthentication()
        .withIdentity()
        .withOAuth2()
        .withComponents()
        .withHTTP(context.http || new HTTPModule())
        .build({ container: context.container });
}

/**
 * The worker never applies migrations, whatever `migrationEnabled` says: a
 * deployment lets one process own that DDL, and it is not this one. It does
 * still create a schema nobody migrates, which is the sqlite shape the shared
 * helper falls through to.
 */
async function migrateWorkerSchema(container: IContainer, dataSource: DataSource): Promise<void> {
    await verifySchemaOrSynchronize(container.resolve(LoggerInjectionKey), dataSource);
}

/**
 * The worker role: the background components and the modules they stand on,
 * and nothing else. No http, oauth2, identity, authentication, ldap, mail or
 * provisioning module, so the process serves no request and writes no
 * provisioning graph.
 *
 * The components are forced on regardless of `componentsEnabled`, so an API
 * replica can hand the sweeps over by turning that flag off while this
 * process keeps running them.
 */
export function createWorkerApplication(context: CreateApplicationContext = {}) {
    return new ApplicationBuilder()
        .withConfig(context.config)
        .withLogger()
        .withCache()
        .withDatabase(new DatabaseModule({ migrate: migrateWorkerSchema }))
        .withComponents(new ComponentsModule({ force: true }))
        .build({ container: context.container });
}
