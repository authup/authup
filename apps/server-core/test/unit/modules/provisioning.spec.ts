/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Realm, Role } from '@authup/core-kit';
import type { Repository } from 'typeorm';
import {
    afterAll,
    beforeAll, describe, expect, it,
} from 'vitest';
import {
    CacheModule, ConfigModule,
    FileProvisioningSource,
    LoggerModule,
    ProvisionerModule,
    RealmEntity, RoleEntity,
} from '../../../src';
import type { IDIContainer } from '../../../src/core';
import { DependencyContainer } from '../../../src/core';
import { TestDatabaseModule } from '../../app';

describe('app/modules/provisioning', () => {
    let di : IDIContainer;

    const config = new ConfigModule();
    const logger = new LoggerModule();
    const cache = new CacheModule();
    const database = new TestDatabaseModule();

    beforeAll(async () => {
        di = new DependencyContainer();

        await config.start(di);
        await logger.start(di);
        await cache.start(di);
        await database.start(di);
    });

    afterAll(async () => {
        await database.stop(di);
    });

    it('should load provisioning data', async () => {
        const source = new FileProvisioningSource({ cwd: 'test/data/sources' });
        const output = await source.load();

        expect(output.roles).toHaveLength(2);
        expect(output.permissions).toHaveLength(1);
        expect(output.scopes).toHaveLength(1);
        expect(output.realms).toHaveLength(1);

        const [realm] = output.realms!;

        expect(realm.relations).toBeDefined();
        expect(realm.relations?.roles).toHaveLength(2);
        expect(realm.relations?.permissions).toHaveLength(1);
        expect(realm.relations?.users).toHaveLength(1);
        expect(realm.relations?.clients).toHaveLength(1);
    });

    it('should synchronize provisioning data', async () => {
        const provisioning = new ProvisionerModule([
            new FileProvisioningSource({ cwd: 'test/data/sources' }),
        ]);
        await provisioning.start(di);

        const realmRepository = di.resolve<Repository<Realm>>(RealmEntity);
        const roleRepository = di.resolve<Repository<Role>>(RoleEntity);

        const realm = await realmRepository.findOneBy({ name: 'foo' });
        expect(realm).toBeDefined();

        const roles = await roleRepository.findBy({ name: 'foo' });
        expect(roles).toHaveLength(2);
    });
});
