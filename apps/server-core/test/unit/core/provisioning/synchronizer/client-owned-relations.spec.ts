/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import type {
    ClientPermission,
    ClientRole,
    ClientScope,
    RolePermission,
    Scope,
} from '@authup/core-kit';
import { FakeEntityRepository } from '@authup/server-test-kit';
import {
    beforeEach,
    describe,
    expect,
    it,
} from 'vitest';
import type {
    IClientPermissionRepository,
    IClientRoleRepository,
    IClientScopeRepository,
    IPermissionRepository,
    IRolePermissionRepository,
    IScopeRepository,
} from '../../../../../src/core/entities/index.ts';
import type { IProvisioningRealmRepairer, ProvisioningSynchronizeContext } from '../../../../../src/core/provisioning/index.ts';
import { ProvisioningEntityStrategyType } from '../../../../../src/core/provisioning/strategy/index.ts';
import { ClientProvisioningSynchronizer } from '../../../../../src/core/provisioning/synchronizer/client/module.ts';
import { PermissionProvisioningSynchronizer } from '../../../../../src/core/provisioning/synchronizer/permission/module.ts';
import { RoleProvisioningSynchronizer } from '../../../../../src/core/provisioning/synchronizer/role/module.ts';
import { FakeClientRepository } from '../../entities/client/fake-repository.ts';
import { FakePermissionRepository } from '../../entities/permission/fake-repository.ts';
import { FakePolicyRepository } from '../../entities/policy/fake-repository.ts';
import { FakeRoleRepository } from '../../entities/role/fake-repository.ts';

/**
 * Roles and clients bind permissions and roles owned by any client of their
 * realm (#3869), and a realm hands its synchronizers a context so those
 * bindings wait for every entity of the realm (#3854).
 */
describe('core/provisioning/synchronizer client-owned relations', () => {
    const realmId = randomUUID();

    let clientRepository: FakeClientRepository;
    let permissionRepository: FakePermissionRepository;
    let roleRepository: FakeRoleRepository;
    let rolePermissionRepository: FakeEntityRepository<RolePermission>;
    let clientPermissionRepository: FakeEntityRepository<ClientPermission>;
    let clientRoleRepository: FakeEntityRepository<ClientRole>;

    let roleSynchronizer: RoleProvisioningSynchronizer;
    let clientSynchronizer: ClientProvisioningSynchronizer;

    let repairs: Array<[string, string, string]>;
    const realmRepairer: IProvisioningRealmRepairer = {
        repairPermission: async (id, realm) => {
            repairs.push(['permission', id, realm]);
        },
        repairRole: async (id, realm) => {
            repairs.push(['role', id, realm]);
        },
    };

    beforeEach(() => {
        clientRepository = new FakeClientRepository();
        permissionRepository = new FakePermissionRepository();
        roleRepository = new FakeRoleRepository();
        rolePermissionRepository = new FakeEntityRepository<RolePermission>();
        clientPermissionRepository = new FakeEntityRepository<ClientPermission>();
        clientRoleRepository = new FakeEntityRepository<ClientRole>();
        repairs = [];

        roleSynchronizer = new RoleProvisioningSynchronizer({
            repository: roleRepository,
            realmRepairer,
            clientRepository,
            policyRepository: new FakePolicyRepository(),
            permissionRepository,
            rolePermissionRepository: rolePermissionRepository as
                FakeEntityRepository<RolePermission> & IRolePermissionRepository,
        });

        clientSynchronizer = new ClientProvisioningSynchronizer({
            clientRepository,
            clientRoleRepository: clientRoleRepository as
                FakeEntityRepository<ClientRole> & IClientRoleRepository,
            clientPermissionRepository: clientPermissionRepository as
                FakeEntityRepository<ClientPermission> & IClientPermissionRepository,
            clientScopeRepository: new FakeEntityRepository<ClientScope>() as
                FakeEntityRepository<ClientScope> & IClientScopeRepository,
            roleRepository,
            permissionRepository: permissionRepository as FakePermissionRepository & IPermissionRepository,
            scopeRepository: new FakeEntityRepository<Scope>() as
                FakeEntityRepository<Scope> & IScopeRepository,
            roleSynchronizer,
            permissionSynchronizer: new PermissionProvisioningSynchronizer({ repository: permissionRepository, realmRepairer }),
            tokenExchangeCapabilitySynchronizer: {
                synchronize: async (input) => input,
                synchronizeMany: async (inputs) => inputs,
            },
        });
    });

    function seedOwner() {
        const owner = clientRepository.seed({ name: 'blog-console', realmId });
        const read = permissionRepository.seed({
            name: 'post_read',
            realmId,
            clientId: owner.id,
        });
        const create = permissionRepository.seed({
            name: 'post_create',
            realmId,
            clientId: owner.id,
        });
        const editor = roleRepository.seed({
            name: 'blog-editor',
            realmId,
            clientId: owner.id,
        });

        return {
            owner,
            read,
            create,
            editor,
        };
    }

    it('should bind a role to permissions a client of its realm owns', async () => {
        const { read, create } = seedOwner();

        await roleSynchronizer.synchronize({
            attributes: { name: 'ops', realmId },
            relations: { clientPermissions: { 'blog-console': ['post_read', 'post_create'] } },
        });

        expect(rolePermissionRepository.getAll().map((row) => row.permissionId).sort())
            .toEqual([read.id, create.id].sort());
    });

    it('should bind every permission of the client for a wildcard', async () => {
        seedOwner();

        await roleSynchronizer.synchronize({
            attributes: { name: 'ops', realmId },
            relations: { clientPermissions: { 'blog-console': ['*'] } },
        });

        expect(rolePermissionRepository.getAll()).toHaveLength(2);
    });

    it('should bind nothing for a client of another realm', async () => {
        seedOwner();

        await roleSynchronizer.synchronize({
            attributes: { name: 'ops', realmId: randomUUID() },
            relations: { clientPermissions: { 'blog-console': ['*'] } },
        });

        expect(rolePermissionRepository.getAll()).toHaveLength(0);
    });

    it('should bind a client to permissions and roles another client owns', async () => {
        const { read, editor } = seedOwner();

        await clientSynchronizer.synchronize({
            attributes: { name: 'content-writer', realmId },
            relations: {
                clientPermissions: { 'blog-console': ['post_read'] },
                clientRoles: { 'blog-console': ['blog-editor'] },
            },
        });

        expect(clientPermissionRepository.getAll().map((row) => row.permissionId)).toEqual([read.id]);
        expect(clientRoleRepository.getAll().map((row) => row.roleId)).toEqual([editor.id]);
    });

    it('should store the permissions and roles a client declares in its realm', async () => {
        await clientSynchronizer.synchronize({
            attributes: { name: 'blog-console', realmId },
            relations: {
                permissions: [{ attributes: { name: 'post_read' } }],
                roles: [{
                    attributes: { name: 'blog-admin' },
                    relations: { clientPermissions: { 'blog-console': ['*'] } },
                }],
            },
        });

        const [permission] = permissionRepository.getAll();
        const [role] = roleRepository.getAll();

        expect(permission!.realmId).toEqual(realmId);
        expect(role!.realmId).toEqual(realmId);
        expect(rolePermissionRepository.getAll()).toEqual([
            expect.objectContaining({ roleId: role!.id, permissionId: permission!.id }),
        ]);
    });

    it('should give a client-owned permission stored without a realm the realm of its client', async () => {
        const owner = clientRepository.seed({ name: 'blog-console', realmId });
        const stored = permissionRepository.seed({
            name: 'post_read',
            realmId: null,
            clientId: owner.id,
        });

        await clientSynchronizer.synchronize({
            attributes: { name: 'blog-console', realmId },
            relations: { permissions: [{ attributes: { name: 'post_read' } }] },
        });

        expect(permissionRepository.getAll()).toEqual([
            expect.objectContaining({ id: stored.id, realmId }),
        ]);
        expect(repairs).toEqual([['permission', stored.id, realmId]]);
    });

    it('should give a client-owned role stored without a realm the realm of its client', async () => {
        const owner = clientRepository.seed({ name: 'blog-console', realmId });
        const stored = roleRepository.seed({
            name: 'blog-admin',
            realmId: null,
            clientId: owner.id,
        });

        await clientSynchronizer.synchronize({
            attributes: { name: 'blog-console', realmId },
            relations: { roles: [{ attributes: { name: 'blog-admin' } }] },
        });

        expect(roleRepository.getAll()).toEqual([
            expect.objectContaining({ id: stored.id, realmId }),
        ]);
        expect(repairs).toEqual([['role', stored.id, realmId]]);
    });

    it('should prefer the realm row over a realm-less row of the same client', async () => {
        const owner = clientRepository.seed({ name: 'blog-console', realmId });
        const realmless = permissionRepository.seed({
            name: 'post_read',
            realmId: null,
            clientId: owner.id,
        });
        const realmRow = permissionRepository.seed({
            name: 'post_read',
            realmId,
            clientId: owner.id,
            description: 'before',
        });

        await clientSynchronizer.synchronize({
            attributes: { name: 'blog-console', realmId },
            relations: {
                permissions: [{
                    strategy: { type: ProvisioningEntityStrategyType.MERGE },
                    attributes: { name: 'post_read', description: 'after' },
                }],
            },
        });

        expect(repairs).toEqual([]);
        expect(await permissionRepository.findOneBy({ id: realmless.id })).toMatchObject({ realmId: null });
        expect(await permissionRepository.findOneBy({ id: realmRow.id })).toMatchObject({ realmId, description: 'after' });
        expect(permissionRepository.getAll()).toHaveLength(2);
    });

    it('should defer the bindings to the context it is handed', async () => {
        const tasks: Array<() => Promise<void>> = [];
        const context: ProvisioningSynchronizeContext = {
            defer: (task) => {
                tasks.push(task);
            },
        };

        await clientSynchronizer.synchronize({
            attributes: { name: 'content-writer', realmId },
            relations: { clientPermissions: { 'blog-console': ['post_read'] } },
        }, context);
        await roleSynchronizer.synchronize({
            attributes: { name: 'ops', realmId },
            relations: { clientPermissions: { 'blog-console': ['post_read'] } },
        }, context);

        // The owning client and its permission appear only after both entries.
        const { read } = seedOwner();

        expect(clientPermissionRepository.getAll()).toHaveLength(0);

        for (const task of tasks) {
            await task();
        }

        expect(clientPermissionRepository.getAll().map((row) => row.permissionId)).toEqual([read.id]);
        expect(rolePermissionRepository.getAll().map((row) => row.permissionId)).toEqual([read.id]);
    });

    it('should leave the bindings of an existing createOnly role alone', async () => {
        seedOwner();
        roleRepository.seed({
            name: 'ops',
            realmId,
            clientId: null,
        });

        await roleSynchronizer.synchronize({
            attributes: { name: 'ops', realmId },
            relations: { clientPermissions: { 'blog-console': ['*'] } },
        });

        expect(rolePermissionRepository.getAll()).toHaveLength(0);
    });
});
