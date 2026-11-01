/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import { BuiltInPolicyType, SystemPolicyName } from '@authup/access';
import { ROLE_REALM_ADMIN_NAME } from '@authup/core-kit';
import { Client as HTTPClient } from '@authup/core-http-kit';
import {
    afterAll,
    beforeAll,
    describe,
    expect,
    it,
} from 'vitest';
import { PolicyEntity } from '../../../../../../src/adapters/database/domains/policy/entity.ts';
import { DatabaseInjectionKey } from '../../../../../../src/app/modules/database';
import { createTestApplication } from '../../../../../app';
import { createFakeRealm, createFakeUser, expectClientError } from '../../../../../utils';
import { createFakeTimePolicy } from '../../../../../utils/domains/policy';

const RUN = randomUUID().slice(0, 8);

describe('src/http/controllers/policy (parent authority)', () => {
    const suite = createTestApplication();

    let realmAdmin: HTTPClient;
    let realmBId: string;
    let foreignRealmId: string;
    let ownParentId: string;
    let foreignParentId: string;
    let systemDefaultId: string;

    beforeAll(async () => {
        await suite.setup();

        const { data: realmA } = await suite.client.realm.create(createFakeRealm());
        const { data: realmB } = await suite.client.realm.create(createFakeRealm());

        realmBId = realmB.id;
        foreignRealmId = realmA.id;

        const { data: foreignParent } = await suite.client.policy.create({
            name: `parent-authority-foreign-${RUN}`,
            type: BuiltInPolicyType.COMPOSITE,
            realmId: realmA.id,
        });

        foreignParentId = foreignParent.id;

        const { data: ownParent } = await suite.client.policy.create({
            name: `parent-authority-own-${RUN}`,
            type: BuiltInPolicyType.COMPOSITE,
            realmId: realmB.id,
        });

        ownParentId = ownParent.id;

        const { data: systemDefault } = await suite.client.policy.getOne(SystemPolicyName.DEFAULT);

        systemDefaultId = systemDefault.id;

        const password = `parent-authority-realm-admin-pw-${RUN}`;
        const { data: user } = await suite.client.user.create(
            createFakeUser({ realmId: realmB.id, password }),
        );
        const { data: role } = await suite.client.role.getOne(ROLE_REALM_ADMIN_NAME);

        await suite.client.userRole.create({ userId: user.id, roleId: role.id });

        const token = await suite.client.token.createWithPassword({
            username: user.name,
            password,
            realm_id: realmB.id,
        });

        realmAdmin = new HTTPClient({ baseURL: suite.baseURL });
        realmAdmin.setAuthorizationHeader({ type: 'Bearer', token: token.access_token });
    });

    afterAll(async () => {
        await suite.teardown();
    });

    async function countByName(name: string) {
        const { data } = await suite.client.policy.getMany({ filters: { name } });

        return data.length;
    }

    /**
     * Places a policy under a parent the API refuses to attach to,
     * as a deployment could hold it from before the gate.
     */
    async function plant(childId: string, parentId: string) {
        const dataSource = suite.container.resolve(DatabaseInjectionKey.DataSource);
        const repository = dataSource.getTreeRepository(PolicyEntity);

        const child = await repository.findOneByOrFail({ id: childId });

        child.parent = await repository.findOneByOrFail({ id: parentId });
        child.parentId = parentId;

        await repository.save(child);
    }

    async function removeIfPresent(id: string) {
        const dataSource = suite.container.resolve(DatabaseInjectionKey.DataSource);
        const repository = dataSource.getTreeRepository(PolicyEntity);
        const entity = await repository.findOneBy({ id });

        if (entity) {
            await repository.remove(entity);
        }
    }

    async function unplant(childId: string) {
        const dataSource = suite.container.resolve(DatabaseInjectionKey.DataSource);
        const repository = dataSource.getTreeRepository(PolicyEntity);

        const child = await repository.findOneBy({ id: childId });

        if (!(child && child.parentId)) {
            return;
        }

        child.parent = null;
        child.parentId = null;

        await repository.save(child);
    }

    it('should refuse attaching a child to a built-in parent without authority over it', async () => {
        await expectClientError(
            () => realmAdmin.policy.create(createFakeTimePolicy({
                name: `parent-authority-builtin-child-${RUN}`,
                realmId: realmBId,
                parentId: systemDefaultId,
            })),
            { status: 403 },
        );

        expect(await countByName(`parent-authority-builtin-child-${RUN}`)).toBe(0);
    });

    it('should refuse a foreign parent before answering its type', async () => {
        const { data: leaf } = await suite.client.policy.create(createFakeTimePolicy({
            name: `parent-authority-foreign-leaf-${RUN}`,
            realmId: foreignRealmId,
        }));

        await expectClientError(
            () => realmAdmin.policy.create(createFakeTimePolicy({
                name: `parent-authority-leaf-child-${RUN}`,
                realmId: realmBId,
                parentId: leaf.id,
            })),
            { status: 403 },
        );

        expect(await countByName(`parent-authority-leaf-child-${RUN}`)).toBe(0);
    });

    it('should refuse attaching a child to a built-in parent for the root admin', async () => {
        await expectClientError(
            () => suite.client.policy.create(createFakeTimePolicy({
                name: `parent-authority-builtin-root-child-${RUN}`,
                parentId: systemDefaultId,
            })),
            { status: 400 },
        );

        expect(await countByName(`parent-authority-builtin-root-child-${RUN}`)).toBe(0);
    });

    it('should let the root admin detach a planted child from a built-in parent', async () => {
        // a time policy without a window restricts nothing, so planting it
        // under system.default leaves every other evaluation untouched
        const { data: child } = await suite.client.policy.create({
            name: `parent-authority-planted-${RUN}`,
            type: BuiltInPolicyType.TIME,
            realmId: realmBId,
        });

        await plant(child.id, systemDefaultId);

        try {
            await expectClientError(
                () => realmAdmin.policy.update(child.id, { parentId: null }),
                { status: 403 },
            );

            const { data: updated } = await suite.client.policy.update(child.id, { parentId: null });

            expect(updated.parentId).toBeNull();

            const { data: systemDefault } = await suite.client.policy.getOne(systemDefaultId);

            expect(systemDefault.builtIn).toBe(true);
        } finally {
            await unplant(child.id);
        }
    });

    it('should refuse deleting an own policy placed under a global composite', async () => {
        const { data: globalParent } = await suite.client.policy.create({
            name: `parent-authority-global-${RUN}`,
            type: BuiltInPolicyType.COMPOSITE,
        });

        const { data: child } = await suite.client.policy.create(createFakeTimePolicy({
            name: `parent-authority-placed-${RUN}`,
            realmId: realmBId,
            parentId: globalParent.id,
        }));

        await expectClientError(
            () => realmAdmin.policy.delete(child.id),
            { status: 403 },
        );

        expect(await countByName(`parent-authority-placed-${RUN}`)).toBe(1);
    });

    it('should refuse deleting an own composite holding a descendant of another realm or the global scope', async () => {
        const { data: root } = await realmAdmin.policy.create({
            name: `parent-authority-subtree-${RUN}`,
            type: BuiltInPolicyType.COMPOSITE,
            realmId: realmBId,
        });

        const { data: foreign } = await suite.client.policy.create({
            name: `parent-authority-subtree-foreign-${RUN}`,
            type: BuiltInPolicyType.TIME,
            realmId: foreignRealmId,
        });

        const { data: global } = await suite.client.policy.create({
            name: `parent-authority-subtree-global-${RUN}`,
            type: BuiltInPolicyType.TIME,
        });

        try {
            await plant(foreign.id, root.id);

            await expectClientError(
                () => realmAdmin.policy.delete(root.id),
                { status: 403 },
            );

            expect(await countByName(`parent-authority-subtree-foreign-${RUN}`)).toBe(1);

            await unplant(foreign.id);
            await plant(global.id, root.id);

            await expectClientError(
                () => realmAdmin.policy.delete(root.id),
                { status: 403 },
            );

            expect(await countByName(`parent-authority-subtree-global-${RUN}`)).toBe(1);
            expect(await countByName(`parent-authority-subtree-${RUN}`)).toBe(1);
        } finally {
            await unplant(foreign.id);
            await unplant(global.id);
            await removeIfPresent(foreign.id);
            await removeIfPresent(global.id);
            await removeIfPresent(root.id);
        }
    });

    it('should delete an own composite together with its own-realm descendants', async () => {
        const { data: root } = await realmAdmin.policy.create({
            name: `parent-authority-own-subtree-${RUN}`,
            type: BuiltInPolicyType.COMPOSITE,
            realmId: realmBId,
        });

        await realmAdmin.policy.create({
            name: `parent-authority-own-subtree-child-${RUN}`,
            type: BuiltInPolicyType.TIME,
            realmId: realmBId,
            parentId: root.id,
        });

        await realmAdmin.policy.delete(root.id);

        expect(await countByName(`parent-authority-own-subtree-${RUN}`)).toBe(0);
        expect(await countByName(`parent-authority-own-subtree-child-${RUN}`)).toBe(0);
    });

    it('should refuse attaching a child to a parent of another realm', async () => {
        await expectClientError(
            () => realmAdmin.policy.create(createFakeTimePolicy({
                name: `parent-authority-foreign-child-${RUN}`,
                realmId: realmBId,
                parentId: foreignParentId,
            })),
            { status: 403 },
        );

        expect(await countByName(`parent-authority-foreign-child-${RUN}`)).toBe(0);
    });

    it('should refuse moving an own policy under a parent of another realm', async () => {
        const { data: child } = await realmAdmin.policy.create(createFakeTimePolicy({
            name: `parent-authority-movable-${RUN}`,
            realmId: realmBId,
        }));

        await expectClientError(
            () => realmAdmin.policy.update(child.id, { parentId: foreignParentId }),
            { status: 403 },
        );

        const { data: stored } = await suite.client.policy.getOne(child.id);

        expect(stored.parentId).toBeNull();
    });

    it('should attach a child to a parent of the own realm', async () => {
        const { data: child } = await realmAdmin.policy.create(createFakeTimePolicy({
            name: `parent-authority-own-child-${RUN}`,
            realmId: realmBId,
            parentId: ownParentId,
        }));

        expect(child.parentId).toBe(ownParentId);
    });
});
