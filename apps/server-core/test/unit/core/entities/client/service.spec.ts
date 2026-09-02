/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import { eq, isQuery } from '@rapiq/core';
import { applyQuery } from '@rapiq/adapter-memory';
import {
    CLIENT_ADMIN_CONSOLE_NAME,
    CLIENT_RESERVED_NAMES,
    IdentityType,
    PermissionName,
} from '@authup/core-kit';
import type { Client, Realm } from '@authup/core-kit';
import { BuiltInPolicyType, PermissionError } from '@authup/access';
import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';
import { ErrorCode } from '@authup/errors';
import { ClientService } from '../../../../../src/core/entities/client/service.ts';
import {
    FakePermissionEvaluator,
    createAllowAllActor,
    createDenyAllActor,
    createNonMasterRealmActor,
} from '@authup/server-test-kit';
import type { FakeActorContext } from '@authup/server-test-kit';
import { FakeRealmRepository } from '../realm/fake-repository.ts';
import { FakeClientRepository } from './fake-repository.ts';
import { createFakeClient } from '../../../../utils/domains/index.ts';

describe('core/entities/client/service', () => {
    let repository: FakeClientRepository;
    let realmRepository: FakeRealmRepository;
    let service: ClientService;

    beforeEach(() => {
        repository = new FakeClientRepository();
        realmRepository = new FakeRealmRepository();
        service = new ClientService({
            repository,
            realmRepository, 
        });
    });

    describe('getMany', () => {
        it('should return entities when actor has permission', async () => {
            repository.seed([createFakeClient()]);
            const result = await service.getMany({}, createAllowAllActor());
            expect(result.data).toHaveLength(1);
        });

        it('should list plaintext-secret rows without per-record evaluation (secret gate lives on the schema)', async () => {
            repository.seed([
                createFakeClient({
                    name: 'safe',
                    secret: null,
                }),
                createFakeClient({
                    name: 'secret-plain',
                    secret: 'mysecret',
                    secretEncrypted: false,
                    secretHashed: false,
                }),
            ]);

            const actor = createAllowAllActor();
            actor.permissionEvaluator.deny('evaluateOneOf');

            const result = await service.getMany({}, actor);
            expect(result.data).toHaveLength(2);
            expect(result.meta.total).toBe(2);
            expect(actor.permissionEvaluator.evaluateOneOfCalls).toHaveLength(0);
        });

        it('does not evaluate the secret gate for the default projection (secret unselected)', async () => {
            const rows = repository.seed([
                createFakeClient({ name: 'safe', secret: null }),
                createFakeClient({
                    name: 'secret-plain',
                    secret: 'mysecret',
                    secretEncrypted: false,
                    secretHashed: false,
                }),
            ]);

            const actor = createAllowAllActor();

            const spy = vi.spyOn(repository, 'findMany');
            await service.getMany({}, actor);

            // secret is not part of the default projection, so the schema gate
            // never fires — no compile, no condition, both rows list
            const query = spy.mock.calls[0]![0];
            const applied = applyQuery(query, rows);
            expect(applied.data).toHaveLength(2);
            expect(actor.permissionEvaluator.compileCalls).toHaveLength(0);
            expect(actor.permissionEvaluator.evaluateOneOfCalls).toHaveLength(0);
        });

        it('redacts uncovered plaintext secrets instead of dropping rows when the projection selects secret', async () => {
            const realmA = randomUUID();
            const realmB = randomUUID();
            const rows = repository.seed([
                createFakeClient({
                    name: 'safe',
                    secret: null,
                    realmId: realmA,
                }),
                createFakeClient({
                    name: 'plain-covered',
                    secret: 'mysecret',
                    secretEncrypted: false,
                    secretHashed: false,
                    realmId: realmA,
                }),
                createFakeClient({
                    name: 'plain-foreign',
                    secret: 'mysecret',
                    secretEncrypted: false,
                    secretHashed: false,
                    realmId: realmB,
                }),
                createFakeClient({
                    name: 'hashed-foreign',
                    secret: '$2b$10$hash',
                    secretHashed: true,
                    secretEncrypted: false,
                    realmId: realmB,
                }),
            ]);

            const actor = createAllowAllActor();
            actor.permissionEvaluator.setCompileResult({
                verdict: 'conditional',
                condition: eq('realmId', realmA),
            });

            const spy = vi.spyOn(repository, 'findMany');
            await service.getMany({ fields: '+secret' }, actor);

            // the schema gate rides the decoded query as a field visibility
            // condition — replaying it drops the uncovered PLAINTEXT value
            // while every row keeps listing; hashed / secret-less rows keep
            // their value regardless of the compiled condition
            const query = spy.mock.calls[0]![0];
            const applied = applyQuery(query, rows);
            expect(applied.data.map((row) => row.name).sort())
                .toEqual(['hashed-foreign', 'plain-covered', 'plain-foreign', 'safe']);

            const byName = new Map(applied.data.map((row) => [row.name, row]));
            expect(byName.get('safe')).toHaveProperty('secret', null);
            expect(byName.get('plain-covered')).toHaveProperty('secret', 'mysecret');
            expect(byName.get('plain-foreign')).not.toHaveProperty('secret');
            expect(byName.get('hashed-foreign')).toHaveProperty('secret', '$2b$10$hash');
            expect(actor.permissionEvaluator.evaluateOneOfCalls).toHaveLength(0);
        });

        it('should not filter entities with hashed secrets', async () => {
            repository.seed([
                createFakeClient({
                    name: 'hashed-client',
                    secret: '$2b$10$hash',
                    secretHashed: true,
                    secretEncrypted: false,
                }),
            ]);

            const result = await service.getMany({}, createAllowAllActor());
            expect(result.data).toHaveLength(1);
        });

        it('should throw when actor lacks permission', async () => {
            await expect(service.getMany({}, createDenyAllActor())).rejects.toMatchObject({ code: ErrorCode.PERMISSION_DENIED });
        });
    });

    describe('getOne', () => {
        it('should return entity by id', async () => {
            const entity = repository.seed(createFakeClient({ name: 'test-client' }));
            const result = await service.getOne(entity.id, createAllowAllActor());
            expect(result.name).toBe('test-client');
        });

        it('should return entity by name', async () => {
            repository.seed([createFakeClient({ name: 'my-client' })]);
            const result = await service.getOne('my-client', createAllowAllActor());
            expect(result.name).toBe('my-client');
        });

        it('should return entity by name with realmId', async () => {
            const realmId = randomUUID();
            realmRepository.seed([{
                id: realmId,
                name: 'client-realm',
                builtIn: false,
            }]);
            repository.seed([createFakeClient({
                name: 'scoped-client',
                realmId,
            })]);

            const result = await service.getOne('scoped-client', createAllowAllActor(), undefined, realmId);
            expect(result.name).toBe('scoped-client');
        });

        it('should throw NotFoundError when realm does not exist for name lookup', async () => {
            repository.seed([createFakeClient({ name: 'some-client' })]);

            await expect(
                service.getOne('some-client', createAllowAllActor(), undefined, randomUUID()),
            ).rejects.toMatchObject({ code: ErrorCode.ENTITY_NOT_FOUND });
        });

        it('should throw NotFoundError when entity does not exist', async () => {
            await expect(service.getOne('non-existent-id', createAllowAllActor())).rejects.toMatchObject({ code: ErrorCode.ENTITY_NOT_FOUND });
        });

        it('should perform per-record check for plaintext secret entities', async () => {
            const entity = repository.seed(createFakeClient({
                name: 'secret-client',
                secret: 'plain',
                secretEncrypted: false,
                secretHashed: false,
            }));

            const actor = createAllowAllActor();
            await service.getOne(entity.id, actor);

            expect(actor.permissionEvaluator.evaluateOneOfCalls.length).toBeGreaterThan(0);
        });

        it('should forward the decoded query and realmId to repository.findOne', async () => {
            const entity = repository.seed(createFakeClient({ name: 'queried-client' }));
            const findOneSpy = vi.spyOn(repository, 'findOne');

            await service.getOne(entity.id, createAllowAllActor(), { fields: '+secret' });

            expect(findOneSpy).toHaveBeenCalledTimes(1);
            const [id, query, realm] = findOneSpy.mock.calls[0];
            expect(id).toBe(entity.id);
            expect(realm).toBeUndefined();
            expect(isQuery(query)).toBe(true);
            expect(query!.fields.value.map((field) => field.name)).toContain('secret');
        });

        it('should bypass the permission gate when actor is the client itself', async () => {
            const entity = repository.seed(createFakeClient({ name: 'self-client' }));
            const actor: FakeActorContext = {
                permissionEvaluator: new FakePermissionEvaluator(),
                identity: {
                    type: IdentityType.CLIENT,
                    data: { id: entity.id, name: 'self-client' } as any,
                },
            };
            actor.permissionEvaluator.denyAll();

            const result = await service.getOne(entity.id, actor);
            expect(result.id).toBe(entity.id);
            expect(actor.permissionEvaluator.preEvaluateOneOfCalls).toHaveLength(0);
            expect(actor.permissionEvaluator.preEvaluateCalls).toHaveLength(0);
            expect(actor.permissionEvaluator.evaluateOneOfCalls).toHaveLength(0);
        });

        it('should bypass permission when self-by-name resolves to actor\'s own record', async () => {
            const entity = repository.seed(createFakeClient({ name: 'self-client' }));
            const actor: FakeActorContext = {
                permissionEvaluator: new FakePermissionEvaluator(),
                identity: {
                    type: IdentityType.CLIENT,
                    data: { id: entity.id, name: 'self-client' } as any,
                },
            };
            actor.permissionEvaluator.denyAll();

            const result = await service.getOne('self-client', actor);
            expect(result.id).toBe(entity.id);
            expect(actor.permissionEvaluator.preEvaluateOneOfCalls).toHaveLength(0);
        });

        it('should require permission when self-by-name resolves to a different entity', async () => {
            const otherEntity = repository.seed(createFakeClient({ name: 'shared-name' }));
            const actor: FakeActorContext = {
                permissionEvaluator: new FakePermissionEvaluator(),
                identity: {
                    type: IdentityType.CLIENT,
                    data: { id: randomUUID(), name: 'shared-name' } as any,
                },
            };
            actor.permissionEvaluator.deny('preEvaluateOneOf');

            await expect(service.getOne('shared-name', actor)).rejects.toMatchObject({ code: ErrorCode.PERMISSION_DENIED });
            expect(otherEntity.name).toBe('shared-name');
        });

        it('should require permission when client actor looks at a different client', async () => {
            const target = repository.seed(createFakeClient({ name: 'other-client' }));
            const actor: FakeActorContext = {
                permissionEvaluator: new FakePermissionEvaluator(),
                identity: {
                    type: IdentityType.CLIENT,
                    data: { id: randomUUID(), name: 'self-client' } as any,
                },
            };
            actor.permissionEvaluator.deny('preEvaluateOneOf');

            await expect(service.getOne(target.id, actor)).rejects.toMatchObject({ code: ErrorCode.PERMISSION_DENIED });
        });

        it('should keep the secret field decodable for a permissionless self client (self leg)', async () => {
            const entity = repository.seed(createFakeClient({
                name: 'self-secret-projection',
                secret: 'plain',
                secretEncrypted: false,
                secretHashed: false,
            }));
            const actor: FakeActorContext = {
                permissionEvaluator: new FakePermissionEvaluator(),
                identity: {
                    type: IdentityType.CLIENT,
                    data: { id: entity.id, name: 'self-secret-projection' } as any,
                },
            };
            actor.permissionEvaluator.denyAll();
            actor.permissionEvaluator.setCompileResult({ verdict: 'deny' });

            const findOneSpy = vi.spyOn(repository, 'findOne');
            await service.getOne(entity.id, actor, { fields: '+secret' });

            // the schema gate answers with a self-scoped CONDITION, never a
            // bare reject — the field survives the decode, and getOne's own
            // isMe bypass stays the authoritative single-read path
            const [, query] = findOneSpy.mock.calls[0]!;
            const secretField = query!.fields.value.find((field) => field.name === 'secret');
            expect(secretField).toBeDefined();
            expect(secretField!.condition).toBeDefined();
        });

        it('should skip post-load secret evaluation on self-access', async () => {
            const entity = repository.seed(createFakeClient({
                name: 'self-secret',
                secret: 'plain',
                secretEncrypted: false,
                secretHashed: false,
            }));
            const actor: FakeActorContext = {
                permissionEvaluator: new FakePermissionEvaluator(),
                identity: {
                    type: IdentityType.CLIENT,
                    data: { id: entity.id, name: 'self-secret' } as any,
                },
            };
            actor.permissionEvaluator.denyAll();

            const result = await service.getOne(entity.id, actor);
            expect(result.id).toBe(entity.id);
            expect(actor.permissionEvaluator.evaluateOneOfCalls).toHaveLength(0);
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
                {
                    name: 'confidential-client',
                    authMethod: 'secret',
                    tokenBindingMethod: 'none',
                },
                createAllowAllActor(),
            );

            expect(result.secret).toBeDefined();
            expect(result.secret).not.toBeNull();
        });

        it('should set secret to null for non-confidential client', async () => {
            const result = await service.create(
                {
                    name: 'public-client',
                    authMethod: 'none',
                    tokenBindingMethod: 'none',
                },
                createAllowAllActor(),
            );

            expect(result.secret).toBeNull();
        });

        it('should call preCheck with CLIENT_CREATE', async () => {
            const actor = createAllowAllActor();
            await service.create({ name: 'test-client' }, actor);
            expect(actor.permissionEvaluator.preEvaluateCalls).toContainEqual({ name: PermissionName.CLIENT_CREATE });
        });

        it('should throw when actor lacks permission', async () => {
            await expect(
                service.create({ name: 'test-client' }, createDenyAllActor()),
            ).rejects.toMatchObject({ code: ErrorCode.PERMISSION_DENIED });
        });

        it('should set realmId from actor for non-master realm', async () => {
            const realmId = randomUUID();
            const actor = createNonMasterRealmActor(realmId);

            const result = await service.create({ name: 'realm-client' }, actor);
            expect(result.realmId).toBe(realmId);
        });
    });

    describe('update', () => {
        it('should update an existing client', async () => {
            const entity = repository.seed(createFakeClient({ name: 'old-name' }));

            const result = await service.update(entity.id, { name: 'new-name' }, createAllowAllActor());
            expect(result.name).toBe('new-name');
        });

        it('should throw NotFoundError when entity does not exist', async () => {
            await expect(
                service.update('non-existent-id', { name: 'x' }, createAllowAllActor()),
            ).rejects.toMatchObject({ code: ErrorCode.ENTITY_NOT_FOUND });
        });

        it('should open one repository transaction for the write and none on create (#3526)', async () => {
            const entity = await service.create(createFakeClient(), createAllowAllActor());
            expect(repository.transactionCalls).toBe(0);

            await service.update(entity.id, { displayName: 'New Display' }, createAllowAllActor());
            expect(repository.transactionCalls).toBe(1);
        });

        it('should generate secret when confidential client has no secret', async () => {
            const entity = repository.seed(createFakeClient({
                name: 'client',
                authMethod: 'secret',
                tokenBindingMethod: 'none',
                secret: null,
            }));

            const result = await service.update(entity.id, { description: 'updated' }, createAllowAllActor());
            expect(result.secret).toBeDefined();
            expect(result.secret).not.toBeNull();
        });

        it('should clear secret when client is set to non-confidential', async () => {
            const entity = repository.seed(createFakeClient({
                name: 'client',
                authMethod: 'secret',
                tokenBindingMethod: 'none',
                secret: 'old-secret',
            }));

            const result = await service.update(entity.id, { authMethod: 'none', tokenBindingMethod: 'none' }, createAllowAllActor());
            expect(result.secret).toBeNull();
        });
    });

    describe('save (upsert)', () => {
        it('should create when entity not found', async () => {
            const {
                entity, 
                created, 
            } = await service.save(
                undefined,
                { name: 'upserted-client' },
                createAllowAllActor(),
            );

            expect(created).toBe(true);
            expect(entity.name).toBe('upserted-client');
        });

        it('should update when entity found', async () => {
            const entity = repository.seed(createFakeClient({ name: 'old' }));

            const { created } = await service.save(entity.id, { name: 'updated' }, createAllowAllActor());
            expect(created).toBe(false);
        });

        it('should throw NotFoundError with updateOnly when entity missing', async () => {
            await expect(
                service.save('non-existent-id', { name: 'test' }, createAllowAllActor(), { updateOnly: true }),
            ).rejects.toMatchObject({ code: ErrorCode.ENTITY_NOT_FOUND });
        });
    });

    describe('self-edit fallback', () => {
        const buildSelfActor = (clientId: string): FakeActorContext => {
            const realmId = randomUUID();
            return {
                permissionEvaluator: new FakePermissionEvaluator(),
                identity: {
                    type: IdentityType.CLIENT,
                    data: {
                        id: clientId,
                        realmId,
                        realm: {
                            id: realmId,
                            name: 'test',
                        } as Realm,
                    } as Client,
                },
            };
        };

        it('should allow self-edit without CLIENT_UPDATE when actor is the client itself', async () => {
            const entity = repository.seed(createFakeClient({ name: 'self-client' }));

            const actor = buildSelfActor(entity.id);
            actor.permissionEvaluator.setBehavior((call) => {
                if (call.method === 'preEvaluate' && call.ctx.name === PermissionName.CLIENT_UPDATE) {
                    throw PermissionError.denied('test');
                }
            });

            const result = await service.update(entity.id, { displayName: 'Self Updated' }, actor);
            expect(result.displayName).toBe('Self Updated');

            expect(actor.permissionEvaluator.preEvaluateCalls).toContainEqual({ name: PermissionName.CLIENT_SELF_MANAGE });
            expect(actor.permissionEvaluator.evaluateCalls).toContainEqual(
                expect.objectContaining({ name: PermissionName.CLIENT_SELF_MANAGE }),
            );
        });

        it('should evaluate CLIENT_SELF_MANAGE against the validated input data, not the merged entity', async () => {
            const entity = repository.seed(createFakeClient({
                name: 'self-client',
                description: 'old',
            }));

            const actor = buildSelfActor(entity.id);
            actor.permissionEvaluator.setBehavior((call) => {
                if (call.method === 'preEvaluate' && call.ctx.name === PermissionName.CLIENT_UPDATE) {
                    throw PermissionError.denied('test');
                }
            });

            await service.update(entity.id, { description: 'updated-desc' }, actor);

            const selfManageCall = actor.permissionEvaluator.evaluateCalls.find(
                (c) => c.name === PermissionName.CLIENT_SELF_MANAGE,
            );
            expect(selfManageCall).toBeDefined();
            const attrs = selfManageCall!.data!.get<Record<string, any>>(BuiltInPolicyType.ATTRIBUTES);
            expect(attrs).toHaveProperty('description', 'updated-desc');
            expect(attrs).not.toHaveProperty('id');
            expect(attrs).not.toHaveProperty('builtIn');
        });

        it('should throw when actor lacks CLIENT_UPDATE and is not the client itself', async () => {
            const entity = repository.seed(createFakeClient({ name: 'other-client' }));

            const actor = buildSelfActor(randomUUID());
            actor.permissionEvaluator.setBehavior((call) => {
                if (call.method === 'preEvaluate' && call.ctx.name === PermissionName.CLIENT_UPDATE) {
                    throw PermissionError.denied('test');
                }
            });

            await expect(
                service.update(entity.id, { displayName: 'forbidden' }, actor),
            ).rejects.toMatchObject({ code: ErrorCode.PERMISSION_DENIED });
        });

        it('should throw when actor lacks both CLIENT_UPDATE and CLIENT_SELF_MANAGE', async () => {
            const entity = repository.seed(createFakeClient({ name: 'self-client' }));

            const actor = buildSelfActor(entity.id);
            actor.permissionEvaluator.denyAll();

            await expect(
                service.update(entity.id, { displayName: 'forbidden' }, actor),
            ).rejects.toMatchObject({ code: ErrorCode.PERMISSION_DENIED });
        });

        it('should NOT default realmId from actor on self-edit', async () => {
            const realmId = randomUUID();
            const entity = repository.seed(createFakeClient({
                name: 'self-client',
                realmId,
            }));

            const actor = buildSelfActor(entity.id);
            actor.permissionEvaluator.setBehavior((call) => {
                if (call.method === 'preEvaluate' && call.ctx.name === PermissionName.CLIENT_UPDATE) {
                    throw PermissionError.denied('test');
                }
            });

            const result = await service.update(entity.id, { displayName: 'kept' }, actor);
            expect(result.realmId).toBe(realmId);
        });
    });

    describe('delete', () => {
        it('should delete an existing client', async () => {
            const entity = repository.seed(createFakeClient());
            const result = await service.delete(entity.id, createAllowAllActor());
            expect(result.id).toBe(entity.id);
        });

        it('should throw NotFoundError when entity does not exist', async () => {
            await expect(service.delete('non-existent-id', createAllowAllActor())).rejects.toMatchObject({ code: ErrorCode.ENTITY_NOT_FOUND });
        });

        it('should call preCheck with CLIENT_DELETE', async () => {
            const entity = repository.seed(createFakeClient());
            const actor = createAllowAllActor();
            await service.delete(entity.id, actor);
            expect(actor.permissionEvaluator.preEvaluateCalls).toContainEqual({ name: PermissionName.CLIENT_DELETE });
        });

        it('should throw when actor lacks permission', async () => {
            const entity = repository.seed(createFakeClient());
            await expect(service.delete(entity.id, createDenyAllActor())).rejects.toMatchObject({ code: ErrorCode.PERMISSION_DENIED });
        });
    });

    describe('guardrails', () => {
        // Covers every reserved system-client name (system plus the
        // plan-079 console clients; `web` left the list with plan 082).
        it.each(CLIENT_RESERVED_NAMES)('should reject creating a client with the reserved name "%s"', async (name) => {
            await expect(
                service.create(
                    createFakeClient({ name }),
                    createAllowAllActor(),
                ),
            ).rejects.toMatchObject({ code: ErrorCode.BAD_REQUEST });
        });

        it('should reject renaming an existing client onto a reserved name', async () => {
            const entity = repository.seed(createFakeClient({ name: 'renamable' }));

            await expect(
                service.update(entity.id, { name: CLIENT_ADMIN_CONSOLE_NAME }, createAllowAllActor()),
            ).rejects.toMatchObject({ code: ErrorCode.BAD_REQUEST });
        });

        // Plan 082 removed the `web` system client, so the name is a plain,
        // creatable client name again.
        it('should allow creating a client named "web"', async () => {
            const result = await service.create(
                createFakeClient({ name: 'web' }),
                createAllowAllActor(),
            );

            expect(result.name).toBe('web');
        });

        it('should strip builtIn on create so API callers cannot self-assign it', async () => {
            const result = await service.create(
                createFakeClient({ builtIn: true } as any),
                createAllowAllActor(),
            );

            expect(result.builtIn).toBeFalsy();
        });
    });
});
