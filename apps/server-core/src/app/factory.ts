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
        .withHTTP()
        .build();
}

/**
 * Neither the worker nor the console role applies migrations, whatever
 * `migrationEnabled` says: a deployment lets one process own that DDL, and
 * it is neither of these. They do still create a schema nobody migrates,
 * which is the sqlite shape the shared helper falls through to.
 */
async function verifyRoleSchema(container: IContainer, dataSource: DataSource): Promise<void> {
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
        .withDatabase(new DatabaseModule({ migrate: verifyRoleSchema }))
        .withComponents(new ComponentsModule({ force: true }))
        .build();
}

/**
 * The console role: the identity provider without its management API. It
 * serves the static consoles (`/console/admin`, `/console/account`) and, like
 * every role with a listener, the whole issuance surface: the hosted auth
 * pages, `/token`, discovery, the federated-login callbacks, the console
 * sign-in and every endpoint those pages call back on the replica rendering
 * them (see `IDP_SURFACE_CONTROLLERS`). What stays unmounted is the entity
 * CRUD, so a request for `/users` that lands here answers 404 even when
 * misrouted: that isolation is the role's identity.
 *
 * It boots like `start` minus provisioning (the API replicas own the boot
 * sync) and minus the background components (a worker or the API replicas
 * own the sweeps), and it never migrates. Mail and LDAP stay: the workflow
 * controllers resolve the mail client at mount, and the password grant
 * behind the hosted login needs LDAP.
 *
 * Which consoles it serves follows the two console flags; the CLI's
 * `console [admin|account]` positionals are sugar over them.
 */
export function createConsoleApplication(context: CreateApplicationContext = {}) {
    return new ApplicationBuilder()
        .withConfig(context.config)
        .withLogger()
        .withCache()
        .withMail()
        .withRuntime()
        .withDatabase(new DatabaseModule({ migrate: verifyRoleSchema }))
        .withLdap()
        .withAuthentication()
        .withIdentity()
        .withOAuth2()
        .withHTTP(new HTTPModule({ managementApi: false }))
        .build();
}
