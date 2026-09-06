/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    CLIENT_SYSTEM_NAME,
    PermissionName,
    REALM_MASTER_NAME,
    ROLE_ADMIN_NAME,
    ScopeName,
} from '@authup/core-kit';
import type {
    Client,
    Permission,
    Policy,
    Realm,
    Role,
    Scope,
    User,
} from '@authup/core-kit';
import { SystemPolicyName } from '@authup/access';
import { Container } from 'eldin';
import type { IContainer } from 'eldin';
import type { Repository } from 'typeorm';
import { IsNull } from 'typeorm';
import {
    afterAll,
    beforeAll,
    describe,
    expect,
    it,
} from 'vitest';
import {
    CacheModule,
    ConfigModule,
    DefaultProvisioningSource,
    LoggerModule,
    ProvisionerModule,
} from '../../../src/index.ts';
import {
    ClientEntity,
    PermissionEntity,
    PolicyEntity,
    RealmEntity,
    RoleEntity,
    ScopeEntity,
    UserEntity,
} from '../../../src/adapters/database/domains/index.ts';
import { DatabaseInjectionKey } from '../../../src/app/modules/database/index.ts';
import { createTestDatabaseModuleForSecondaryInstance } from '../../app/index.ts';

// The provisioning lock is a no-op on better-sqlite3: one database file per
// container means a second replica cannot reach it, so there is nothing to
// serialize and this race does not exist in that topology.
const lockable = ['mysql', 'postgres'].includes(process.env.DB_TYPE ?? '');

// Schema synchronize plus two full provisioning passes, both before the first
// assertion runs.
const HOOK_TIMEOUT = 120_000;

describe.skipIf(!lockable)('app/modules/provisioning (concurrency)', () => {
    let di: IContainer;

    const config = new ConfigModule();
    const logger = new LoggerModule();
    const cache = new CacheModule();
    // An EMPTY database: the per-worker sqlite copy is a provisioned template,
    // and this race only exists on the first boot.
    const database = createTestDatabaseModuleForSecondaryInstance('provisioning-race');

    beforeAll(async () => {
        di = new Container();

        await config.setup(di);
        await logger.setup(di);
        await cache.setup(di);
        await database.setup(di);

        // Two replicas booting at once. One DataSource is enough to model
        // them: each setup() takes its own query runner, so the two contend
        // on separate pooled connections, which is what the session-scoped
        // advisory lock is arbitrated by.
        await Promise.all([
            new ProvisionerModule([new DefaultProvisioningSource()]).setup(di),
            new ProvisionerModule([new DefaultProvisioningSource()]).setup(di),
        ]);
    }, HOOK_TIMEOUT);

    afterAll(async () => {
        await database.teardown(di);
    });

    it('should not crash the losing replica on a unique constraint', () => {
        // Reaching the assertions at all is the assertion: an unserialized
        // second pass loses the master-realm insert to
        // `UQ auth_realms(name)`, and ProvisionerModule.setup has no catch.
        expect(di.resolve(DatabaseInjectionKey.DataSource)).toBeDefined();
    });

    it('should provision the realm-bound rows exactly once', async () => {
        const realmRepository = di.resolve<Repository<Realm>>(RealmEntity);
        const clientRepository = di.resolve<Repository<Client>>(ClientEntity);
        const userRepository = di.resolve<Repository<User>>(UserEntity);

        expect(await realmRepository.countBy({ name: REALM_MASTER_NAME })).toEqual(1);
        expect(await clientRepository.countBy({ name: CLIENT_SYSTEM_NAME })).toEqual(1);
        expect(await userRepository.countBy({ name: 'admin' })).toEqual(1);
    });

    // The half no duplicate-key guard can reach. auth_permissions, auth_roles,
    // auth_scopes and auth_policies are unique over a tuple carrying a
    // nullable column, and every row the default source declares for them is
    // global, so all three dialects treat the two inserts as distinct and
    // write both. Nothing raises, and no cleanup pass removes them.
    it('should provision the global rows exactly once', async () => {
        const permissionRepository = di.resolve<Repository<Permission>>(PermissionEntity);
        const roleRepository = di.resolve<Repository<Role>>(RoleEntity);
        const scopeRepository = di.resolve<Repository<Scope>>(ScopeEntity);
        const policyRepository = di.resolve<Repository<Policy>>(PolicyEntity);

        expect(await permissionRepository.countBy({
            name: PermissionName.REALM_READ,
            realmId: IsNull(),
            clientId: IsNull(),
        })).toEqual(1);

        expect(await roleRepository.countBy({
            name: ROLE_ADMIN_NAME,
            realmId: IsNull(),
            clientId: IsNull(),
        })).toEqual(1);

        expect(await scopeRepository.countBy({
            name: ScopeName.GLOBAL,
            realmId: IsNull(),
        })).toEqual(1);

        expect(await policyRepository.countBy({
            name: SystemPolicyName.DEFAULT,
            realmId: IsNull(),
        })).toEqual(1);
    });
});
