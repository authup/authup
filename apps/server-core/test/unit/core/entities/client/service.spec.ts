/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import { PermissionName } from '@authup/core-kit';
import type { Client } from '@authup/core-kit';
import {
    beforeEach, describe, expect, it, vi,
} from 'vitest';
import { ForbiddenError, NotFoundError } from '@ebec/http';
import { ClientService } from '../../../../../src/core/entities/client/service.ts';
import type { IClientRepository } from '../../../../../src/core/entities/client/types.ts';
import { FakeEntityRepository } from '../../helpers/fake-repository.ts';
import { FakeRealmRepository } from '../../helpers/fake-realm-repository.ts';
import {
    createAllowAllActor,
    createDenyAllActor,
    createNonMasterRealmActor,
} from '../../helpers/mock-actor.ts';

class FakeClientRepository extends FakeEntityRepository<Client> implements IClientRepository {
    async checkUniqueness(): Promise<void> {
        // no-op
    }

    async findOneWithSecret(where: Record<string, any>): Promise<Client | null> {
        return this.findOneBy(where);
    }
}

describe('core/entities/client/service', () => {
    let repository: FakeClientRepository;
    let realmRepository: FakeRealmRepository;
    let service: ClientService;

    beforeEach(() => {
        repository = new FakeClientRepository();
        realmRepository = new FakeRealmRepository();
        service = new ClientService({ repository, realmRepository });
    });

    describe('getMany', () => {
        it('should return entities when actor has permission', async () => {
            repository.seed([{ id: randomUUID(), name: 'client-a' } as Client]);
            const result = await service.getMany({}, createAllowAllActor());
            expect(result.data).toHaveLength(1);
        });

        it('should filter out entities with plaintext secrets on per-record permission failure', async () => {
            repository.seed([
                {
                    id: randomUUID(), name: 'safe', secret: null,
                } as Client,
                {
                    id: randomUUID(),
                    name: 'secret-plain',
                    secret: 'mysecret',
                    secret_encrypted: false,
                    secret_hashed: false,
                } as Client,
            ]);

            const actor = createAllowAllActor();
            vi.mocked(actor.permissionChecker.checkOneOf).mockRejectedValue(new ForbiddenError());

            const result = await service.getMany({}, actor);
            expect(result.data).toHaveLength(1);
            expect(result.data[0].name).toBe('safe');
            expect(result.meta.total).toBe(1);
        });

        it('should not filter entities with hashed secrets', async () => {
            repository.seed([
                {
                    id: randomUUID(),
                    name: 'hashed-client',
                    secret: '$2b$10$hash',
                    secret_hashed: true,
                    secret_encrypted: false,
                } as Client,
            ]);

            const result = await service.getMany({}, createAllowAllActor());
            expect(result.data).toHaveLength(1);
        });

        it('should throw when actor lacks permission', async () => {
            await expect(service.getMany({}, createDenyAllActor())).rejects.toThrow(ForbiddenError);
        });
    });

    describe('getOne', () => {
        it('should return entity by id', async () => {
            const id = randomUUID();
            repository.seed([{ id, name: 'test-client' } as Client]);
            const result = await service.getOne(id, createAllowAllActor());
            expect(result.name).toBe('test-client');
        });

        it('should return entity by name', async () => {
            repository.seed([{ id: randomUUID(), name: 'my-client' } as Client]);
            const result = await service.getOne('my-client', createAllowAllActor());
            expect(result.name).toBe('my-client');
        });

        it('should return entity by name with realmId', async () => {
            const realmId = randomUUID();
            realmRepository.seed([{
                id: realmId, name: 'client-realm', built_in: false,
            } as any]);
            repository.seed([{
                name: 'scoped-client', realm_id: realmId,
            } as Client]);

            const result = await service.getOne('scoped-client', createAllowAllActor(), realmId);
            expect(result.name).toBe('scoped-client');
        });

        it('should throw NotFoundError when realm does not exist for name lookup', async () => {
            repository.seed([{ name: 'some-client' } as Client]);

            await expect(
                service.getOne('some-client', createAllowAllActor(), randomUUID()),
            ).rejects.toThrow(NotFoundError);
        });

        it('should throw NotFoundError when entity does not exist', async () => {
            await expect(service.getOne(randomUUID(), createAllowAllActor())).rejects.toThrow(NotFoundError);
        });

        it('should perform per-record check for plaintext secret entities', async () => {
            const id = randomUUID();
            repository.seed([{
                id,
                name: 'secret-client',
                secret: 'plain',
                secret_encrypted: false,
                secret_hashed: false,
            } as Client]);

            const actor = createAllowAllActor();
            await service.getOne(id, actor);

            expect(actor.permissionChecker.checkOneOf).toHaveBeenCalled();
        });
    });

    describe('create', () => {
        it('should create a client with valid data', async () => {
            const result = await service.create(
                { name: 'new-client' },
                createAllowAllActor(),
            );

            expect(result.id).toBeDefined();
            expect(result.name).toBe('new-client');
        });

        it('should generate secret for confidential client', async () => {
            const result = await service.create(
                { name: 'confidential-client', is_confidential: true },
                createAllowAllActor(),
            );

            expect(result.secret).toBeDefined();
            expect(result.secret).not.toBeNull();
        });

        it('should set secret to null for non-confidential client', async () => {
            const result = await service.create(
                { name: 'public-client', is_confidential: false },
                createAllowAllActor(),
            );

            expect(result.secret).toBeNull();
        });

        it('should call preCheck with CLIENT_CREATE', async () => {
            const actor = createAllowAllActor();
            await service.create({ name: 'test-client' }, actor);
            expect(actor.permissionChecker.preCheck).toHaveBeenCalledWith({
                name: PermissionName.CLIENT_CREATE,
            });
        });

        it('should throw when actor lacks permission', async () => {
            await expect(
                service.create({ name: 'test-client' }, createDenyAllActor()),
            ).rejects.toThrow(ForbiddenError);
        });

        it('should set realm_id from actor for non-master realm', async () => {
            const realmId = randomUUID();
            const actor = createNonMasterRealmActor(realmId);

            const result = await service.create({ name: 'realm-client' }, actor);
            expect(result.realm_id).toBe(realmId);
        });
    });

    describe('update', () => {
        it('should update an existing client', async () => {
            const id = randomUUID();
            repository.seed([{ id, name: 'old-name' } as Client]);

            const result = await service.update(id, { name: 'new-name' }, createAllowAllActor());
            expect(result.name).toBe('new-name');
        });

        it('should throw NotFoundError when entity does not exist', async () => {
            await expect(
                service.update(randomUUID(), { name: 'x' }, createAllowAllActor()),
            ).rejects.toThrow(NotFoundError);
        });

        it('should generate secret when confidential client has no secret', async () => {
            const id = randomUUID();
            repository.seed([{
                id, name: 'client', is_confidential: true, secret: null,
            } as Client]);

            const result = await service.update(id, { description: 'updated' }, createAllowAllActor());
            expect(result.secret).toBeDefined();
            expect(result.secret).not.toBeNull();
        });

        it('should clear secret when client is set to non-confidential', async () => {
            const id = randomUUID();
            repository.seed([{
                id, name: 'client', is_confidential: true, secret: 'old-secret',
            } as Client]);

            const result = await service.update(id, { is_confidential: false }, createAllowAllActor());
            expect(result.secret).toBeNull();
        });
    });

    describe('save (upsert)', () => {
        it('should create when entity not found', async () => {
            const { entity, created } = await service.save(
                undefined,
                { name: 'upserted-client' },
                createAllowAllActor(),
            );

            expect(created).toBe(true);
            expect(entity.name).toBe('upserted-client');
        });

        it('should update when entity found', async () => {
            const id = randomUUID();
            repository.seed([{ id, name: 'old' } as Client]);

            const { created } = await service.save(id, { name: 'updated' }, createAllowAllActor());
            expect(created).toBe(false);
        });

        it('should throw NotFoundError with updateOnly when entity missing', async () => {
            await expect(
                service.save(randomUUID(), { name: 'test' }, createAllowAllActor(), { updateOnly: true }),
            ).rejects.toThrow(NotFoundError);
        });
    });

    describe('delete', () => {
        it('should delete an existing client', async () => {
            const id = randomUUID();
            repository.seed([{ id, name: 'deletable' } as Client]);
            const result = await service.delete(id, createAllowAllActor());
            expect(result.id).toBe(id);
        });

        it('should throw NotFoundError when entity does not exist', async () => {
            await expect(service.delete(randomUUID(), createAllowAllActor())).rejects.toThrow(NotFoundError);
        });

        it('should call preCheck with CLIENT_DELETE', async () => {
            const id = randomUUID();
            repository.seed([{ id, name: 'test' } as Client]);
            const actor = createAllowAllActor();
            await service.delete(id, actor);
            expect(actor.permissionChecker.preCheck).toHaveBeenCalledWith({
                name: PermissionName.CLIENT_DELETE,
            });
        });

        it('should throw when actor lacks permission', async () => {
            const id = randomUUID();
            repository.seed([{ id, name: 'test' } as Client]);
            await expect(service.delete(id, createDenyAllActor())).rejects.toThrow(ForbiddenError);
        });
    });
});
