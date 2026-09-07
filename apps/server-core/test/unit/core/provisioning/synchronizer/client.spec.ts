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
    Permission,
    Role,
    Scope,
} from '@authup/core-kit';
import { isBCryptHash } from '@authup/kit';
import { hash } from '@authup/server-kit';
import { FakeEntityRepository } from '@authup/server-test-kit';
import { ErrorCode } from '@authup/errors';
import {
    beforeEach,
    describe,
    expect,
    it,
} from 'vitest';
import { ClientProvisioningSynchronizer } from '../../../../../src/core/provisioning/synchronizer/client/module.ts';
import type { ClientProvisioningEntity } from '../../../../../src/core/provisioning/entities/client/types.ts';
import { ProvisioningEntityStrategyType } from '../../../../../src/core/provisioning/strategy/index.ts';
import type {
    IClientPermissionRepository,
    IClientRoleRepository,
    IClientScopeRepository,
    IPermissionRepository,
    IRoleRepository,
    IScopeRepository,
} from '../../../../../src/core/entities/index.ts';
import { isRealmCipherBlob } from '../../../../../src/core/key/index.ts';
import { FakeClientRepository } from '../../entities/client/fake-repository.ts';
import { createFakeRealmCipher } from '../../helpers/realm-cipher.ts';

/**
 * The synchronizer writes attributes straight to the repository, so it is
 * the one client write path that never went through the credential service:
 * a file declaring `secretHashed: true` with a raw secret stored the raw
 * secret under a flag the read gate trusts (plan 105, #3351).
 */
describe('core/provisioning/synchronizer/client', () => {
    let clientRepository: FakeClientRepository;
    let synchronizer: ClientProvisioningSynchronizer;
    const realmId = randomUUID();
    const cipher = createFakeRealmCipher(realmId);

    beforeEach(() => {
        clientRepository = new FakeClientRepository();
        synchronizer = new ClientProvisioningSynchronizer({
            clientRepository,
            cipher,
            clientRoleRepository: new FakeEntityRepository<ClientRole>() as
                FakeEntityRepository<ClientRole> & IClientRoleRepository,
            clientPermissionRepository: new FakeEntityRepository<ClientPermission>() as
                FakeEntityRepository<ClientPermission> & IClientPermissionRepository,
            clientScopeRepository: new FakeEntityRepository<ClientScope>() as
                FakeEntityRepository<ClientScope> & IClientScopeRepository,
            roleRepository: new FakeEntityRepository<Role>() as
                FakeEntityRepository<Role> & IRoleRepository,
            permissionRepository: new FakeEntityRepository<Permission>() as
                FakeEntityRepository<Permission> & IPermissionRepository,
            scopeRepository: new FakeEntityRepository<Scope>() as
                FakeEntityRepository<Scope> & IScopeRepository,
            roleSynchronizer: {
                synchronize: async (input) => input,
                synchronizeMany: async (inputs) => inputs,
            },
            permissionSynchronizer: {
                synchronize: async (input) => input,
                synchronizeMany: async (inputs) => inputs,
            },
        });
    });

    function buildInput(attributes: Record<string, any>): ClientProvisioningEntity {
        return {
            strategy: { type: ProvisioningEntityStrategyType.MERGE },
            attributes: {
                name: 'gitops',
                realmId,
                authMethod: 'secret',
                tokenBindingMethod: 'none',
                ...attributes,
            },
        } as ClientProvisioningEntity;
    }

    it('should hash a raw secret the file declares as hashed', async () => {
        await synchronizer.synchronize(buildInput({ secret: 'raw-secret', secretHashed: true }));

        const [stored] = clientRepository.getAll();
        expect(stored.secretHashed).toBe(true);
        expect(stored.secret).not.toEqual('raw-secret');
        expect(isBCryptHash(stored.secret!)).toBe(true);
    });

    it('should keep a pre-hashed secret verbatim (a file need not hold plaintext)', async () => {
        const hashed = await hash('raw-secret');

        await synchronizer.synchronize(buildInput({ secret: hashed, secretHashed: true }));

        const [stored] = clientRepository.getAll();
        expect(stored.secret).toEqual(hashed);
    });

    it('should re-hash a raw secret merged onto an existing hashed client', async () => {
        const existing = clientRepository.seed({
            name: 'gitops',
            realmId,
            authMethod: 'secret',
            tokenBindingMethod: 'none',
            secret: await hash('old'),
            secretHashed: true,
        });

        await synchronizer.synchronize(buildInput({ secret: 'rotated-raw', secretHashed: true }));

        const stored = await clientRepository.findOneBy({ id: existing.id });
        expect(stored!.secret).not.toEqual('rotated-raw');
        expect(isBCryptHash(stored!.secret!)).toBe(true);
    });

    it('should store a plain secret verbatim', async () => {
        await synchronizer.synchronize(buildInput({ secret: 'plain', secretHashed: false }));

        const [stored] = clientRepository.getAll();
        expect(stored.secret).toEqual('plain');
    });

    it('should encrypt a raw secret the file declares as encrypted', async () => {
        await synchronizer.synchronize(buildInput({ secret: 'raw-secret', secretEncrypted: true }));

        const [stored] = clientRepository.getAll();
        expect(stored.secretEncrypted).toBe(true);
        expect(isRealmCipherBlob(stored.secret!)).toBe(true);
        expect(await cipher.decrypt(stored.secret!, realmId)).toEqual('raw-secret');
    });

    it('should keep a value that already is a cipher blob verbatim', async () => {
        const blob = await cipher.encrypt('raw-secret', realmId);

        await synchronizer.synchronize(buildInput({ secret: blob, secretEncrypted: true }));

        const [stored] = clientRepository.getAll();
        expect(stored.secret).toEqual(blob);
    });

    it('should refuse hashed and encrypted at once', async () => {
        await expect(
            synchronizer.synchronize(buildInput({
                secret: 'raw', 
                secretHashed: true, 
                secretEncrypted: true, 
            })),
        ).rejects.toMatchObject({ code: ErrorCode.BAD_REQUEST });

        expect(clientRepository.getAll()).toHaveLength(0);
    });
});
