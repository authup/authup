/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IContainer } from 'eldin';
import type { DataSource } from 'typeorm';
import { synchronizeDatabaseSchema } from 'typeorm-extension';
import { ApplicationBuilder } from './builder.ts';
import {
    ComponentsModule,
    DatabaseModule,
    DefaultProvisioningSource,
    LoggerInjectionKey,
    ProvisionerModule,
    assertNoPendingMigrations,
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
        .withHTTP()
        .build();
}

/**
 * The worker never applies schema changes, whatever `migrationEnabled` says:
 * a deployment lets one process own the DDL, and it is not this one.
 *
 * `assertNoPendingMigrations` resolves false when the resolved data-source
 * options carry no migrations at all (the sqlite shape). Nothing can be
 * pending there and the schema still has to exist, so the caller falls
 * through to a schema synchronize. Dropping that branch would leave a sqlite
 * worker with no schema.
 */
async function migrateWorkerSchema(container: IContainer, dataSource: DataSource): Promise<void> {
    const logger = container.resolve(LoggerInjectionKey);

    logger.debug('Verifying database schema...');
    const verified = await assertNoPendingMigrations(dataSource);
    if (verified) {
        logger.debug('Verified database schema.');
        return;
    }

    logger.debug('Migrating database...');
    await synchronizeDatabaseSchema(dataSource);
    logger.debug('Migrated database');
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
        .build();
}
