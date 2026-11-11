/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import { RealmScope } from '@authup/access';
import { ROLE_ADMIN_NAME, ROLE_REALM_ADMIN_NAME } from '@authup/core-kit';
import { IsNull } from 'typeorm';
import {
    describe,
    expect,
    it,
    vi,
} from 'vitest';
import {
    CacheModule,
    ConfigModule,
    LoggerModule,
    PermissionEntity,
    RoleEntity,
    RolePermissionEntity,
} from '../../../src/index.ts';
import { TaggedCacheInjectionKey } from '../../../src/app/modules/cache/index.ts';
import {
    TestApplication,
    buildTestRedisOptions,
    createTestApplication,
    createTestDatabaseModuleForSuite,
} from '../../app/index.ts';
import { createFakeRealm, createFakeUser } from '../../utils/index.ts';

// Spec files sharing a pool slot share its database, and writers outside
// createTestApplication (provisioning.spec.ts) do not share its cache (#3688).
describe('test applications in one worker', () => {
    it('a later application does not read an entry an earlier one filled', async () => {
        const first = createTestApplication();

        await first.setup();
        await first.container.resolve(TaggedCacheInjectionKey).remember('isolation', async () => 'first', { tags: () => ['isolation'] });
        await first.teardown();

        const second = createTestApplication();

        await second.setup();

        const read = vi.fn(async () => 'second');

        try {
            await expect(second.container.resolve(TaggedCacheInjectionKey).remember('isolation', read, { tags: () => ['isolation'] }))
                .resolves.toEqual('second');
            expect(read).toHaveBeenCalledTimes(1);
        } finally {
            await second.teardown();
        }
    });

    it('a grant written without the suite cache reaches the next application', async () => {
        const first = createTestApplication();

        await first.setup();
        await first.client.role.getMany();
        await first.teardown();

        const writer = new TestApplication({
            modules: [
                new ConfigModule(),
                new LoggerModule(),
                new CacheModule(),
                createTestDatabaseModuleForSuite(),
            ],
        });

        await writer.setup();

        const permission = await writer.dataSource.getRepository(PermissionEntity).save({ name: `isolation-${randomUUID().slice(0, 8)}` });

        for (const name of [ROLE_ADMIN_NAME, ROLE_REALM_ADMIN_NAME]) {
            const role = await writer.dataSource.getRepository(RoleEntity).findOneByOrFail({ name, realmId: IsNull() });

            await writer.dataSource.getRepository(RolePermissionEntity).save({
                roleId: role.id,
                roleRealmId: null,
                permissionId: permission.id,
                permissionRealmId: null,
                realmScope: name === ROLE_ADMIN_NAME ? RealmScope.ANY : RealmScope.OWN_OR_NULL,
            });
        }

        await writer.teardown();

        const second = createTestApplication();

        await second.setup();

        try {
            const { data: realm } = await second.client.realm.create(createFakeRealm());
            const { data: user } = await second.client.user.create(createFakeUser({ realmId: realm.id }));
            const { data: role } = await second.client.role.getOne(ROLE_REALM_ADMIN_NAME);

            await expect(second.client.userRole.create({ userId: user.id, roleId: role.id })).resolves.toBeDefined();
        } finally {
            await second.client.permission.delete(permission.id);
            await second.teardown();
        }
    });
});

describe('buildTestRedisOptions', () => {
    it('keeps tls for a rediss url', () => {
        const previous = process.env.TEST_REDIS_URL;

        try {
            process.env.TEST_REDIS_URL = 'rediss://127.0.0.1:6380';
            expect(buildTestRedisOptions()).toMatchObject({
                host: '127.0.0.1', 
                port: 6380, 
                tls: {}, 
            });

            process.env.TEST_REDIS_URL = 'redis://127.0.0.1:6380';
            expect(buildTestRedisOptions()).not.toHaveProperty('tls');
        } finally {
            if (typeof previous === 'undefined') {
                delete process.env.TEST_REDIS_URL;
            } else {
                process.env.TEST_REDIS_URL = previous;
            }
        }
    });
});
