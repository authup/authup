/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import { BuiltInPolicyType, PermissionError, PolicyDefaultValidators } from '@authup/access';
import { ErrorCode, ValidationError } from '@authup/errors';
import { PermissionName } from '@authup/core-kit';
import type { Policy } from '@authup/core-kit';
import {
    FakePermissionEvaluator,
    createAllowAllActor,
    createMasterRealmActor,
    createNonMasterRealmActor,
} from '@authup/server-test-kit';
import { createValidator } from '@validup/zod';
import { Container } from 'validup';
import {
    beforeEach,
    describe,
    expect,
    it,
} from 'vitest';
import { z } from 'zod';
import { PolicyService } from '../../../../../src/core/entities/policy/service.ts';
import { FakeRealmRepository } from '../realm/fake-repository.ts';
import { readEvaluatedRecordRealms } from '../../helpers/index.ts';
import { FakePolicyRepository } from './fake-repository.ts';

describe('core/entities/policy/service', () => {
    let repository: FakePolicyRepository;
    let realmRepository: FakeRealmRepository;
    let service: PolicyService;

    beforeEach(() => {
        repository = new FakePolicyRepository();
        realmRepository = new FakeRealmRepository();
        service = new PolicyService({ repository, realmRepository });
    });

    function seed(name: string): Policy {
        return repository.seed({
            id: randomUUID(),
            name,
            type: BuiltInPolicyType.COMPOSITE,
            builtIn: false,
            invert: false,
            realmId: null,
        } as Policy);
    }

    describe('update with a restricted grant (#3654)', () => {
        function createRestrictedActor() {
            const permissionEvaluator = new FakePermissionEvaluator();

            permissionEvaluator.setBehavior((call) => {
                if (call.method !== 'evaluate' || call.ctx.name !== PermissionName.PERMISSION_UPDATE) {
                    return;
                }

                const attributes = call.ctx.data?.get(BuiltInPolicyType.ATTRIBUTES) as Partial<Policy>;

                if (!attributes?.name?.startsWith('reach-')) {
                    throw PermissionError.denied('test');
                }
            });

            return { permissionEvaluator };
        }

        it('should evaluate the stored and the updated row in the policy\'s realm', async () => {
            const realmId = randomUUID();
            const entity = repository.seed({
                id: randomUUID(),
                name: 'reach-a',
                type: BuiltInPolicyType.COMPOSITE,
                builtIn: false,
                invert: false,
                realmId,
            } as Policy);
            const actor = createAllowAllActor();

            await service.update(entity.id, { name: 'reach-b' }, actor);
            expect(readEvaluatedRecordRealms(actor.permissionEvaluator, PermissionName.PERMISSION_UPDATE))
                .toEqual([realmId, realmId]);
        });

        it('should refuse moving an unreachable row into reach', async () => {
            const entity = seed('outside');

            await expect(
                service.update(entity.id, { name: 'reach-inside' }, createRestrictedActor()),
            ).rejects.toThrow(PermissionError);
            expect((await repository.findOneById(entity.id))?.name).toBe('outside');
        });

        it('should allow updating a row that stays in reach', async () => {
            const entity = seed('reach-a');

            const result = await service.update(entity.id, { name: 'reach-b' }, createRestrictedActor());

            expect(result.name).toBe('reach-b');
        });

        it('should refuse moving a reachable row out of reach', async () => {
            const entity = seed('reach-a');

            await expect(
                service.update(entity.id, { name: 'outside' }, createRestrictedActor()),
            ).rejects.toThrow(PermissionError);
            expect((await repository.findOneById(entity.id))?.name).toBe('reach-a');
        });
    });

    describe('parent authority', () => {
        function seedParent(name: string, extra: Partial<Policy> = {}): Policy {
            return repository.seed({
                id: randomUUID(),
                name,
                type: BuiltInPolicyType.COMPOSITE,
                builtIn: false,
                invert: false,
                realmId: null,
                ...extra,
            } as Policy);
        }

        function createRealmDenyingActor(deniedRealmId: string | null) {
            const permissionEvaluator = new FakePermissionEvaluator();

            permissionEvaluator.setBehavior((call) => {
                if (call.method !== 'evaluate') {
                    return;
                }

                if (call.ctx.data?.get(BuiltInPolicyType.REALM_MATCH) === deniedRealmId) {
                    throw PermissionError.denied('test');
                }
            });

            return { permissionEvaluator };
        }

        it('should refuse a built-in parent on create', async () => {
            const parent = seedParent('system-parent', { builtIn: true });

            await expect(service.create({
                name: 'attach-builtin',
                type: BuiltInPolicyType.COMPOSITE,
                parentId: parent.id,
            }, createAllowAllActor())).rejects.toThrow(ValidationError);
            expect(await repository.findOneBy({ name: 'attach-builtin' })).toBeNull();
        });

        it('should evaluate the update of the parent in the parent\'s realm on create', async () => {
            const realmId = randomUUID();
            const parent = seedParent('realm-parent', { realmId });
            const actor = createAllowAllActor();

            await service.create({
                name: 'attach-child',
                type: BuiltInPolicyType.COMPOSITE,
                realmId,
                parentId: parent.id,
            }, actor);

            const updates = actor.permissionEvaluator.evaluateCalls
                .filter((call) => call.name === PermissionName.PERMISSION_UPDATE);

            expect(updates).toHaveLength(1);
            expect(updates[0].data!.get(BuiltInPolicyType.REALM_MATCH)).toBe(realmId);
            expect((updates[0].data!.get(BuiltInPolicyType.ATTRIBUTES) as Policy).id).toBe(parent.id);
        });

        it('should refuse a parent the actor cannot update on create', async () => {
            const foreignRealmId = randomUUID();
            const parent = seedParent('foreign-parent', { realmId: foreignRealmId });

            await expect(service.create({
                name: 'attach-foreign',
                type: BuiltInPolicyType.COMPOSITE,
                realmId: randomUUID(),
                parentId: parent.id,
            }, createRealmDenyingActor(foreignRealmId))).rejects.toThrow(PermissionError);
            expect(await repository.findOneBy({ name: 'attach-foreign' })).toBeNull();
        });

        it('should keep a global child under a realm parent the actor can update', async () => {
            const realmId = randomUUID();
            const parent = seedParent('own-parent', { realmId });

            const entity = await service.create({
                name: 'global-child',
                type: BuiltInPolicyType.COMPOSITE,
                parentId: parent.id,
            }, createAllowAllActor());

            expect(entity.realmId).toBeNull();
            expect(entity.parentId).toBe(parent.id);
        });

        it('should refuse moving a policy under a parent the actor cannot update', async () => {
            const realmId = randomUUID();
            const foreignRealmId = randomUUID();
            const parent = seedParent('foreign-target', { realmId: foreignRealmId });
            const entity = seedParent('movable', { realmId });

            await expect(service.update(entity.id, { parentId: parent.id }, createRealmDenyingActor(foreignRealmId)))
                .rejects.toThrow(PermissionError);
            expect((await repository.findOneById(entity.id))?.parentId).toBeFalsy();
        });

        it('should refuse moving a policy under a built-in parent', async () => {
            const parent = seedParent('builtin-target', { builtIn: true });
            const entity = seedParent('movable-builtin', { realmId: randomUUID() });

            await expect(service.update(entity.id, { parentId: parent.id }, createAllowAllActor()))
                .rejects.toThrow(ValidationError);
            expect((await repository.findOneById(entity.id))?.parentId).toBeFalsy();
        });

        it('should refuse detaching a policy from a parent the actor cannot update', async () => {
            const realmId = randomUUID();
            const foreignRealmId = randomUUID();
            const parent = seedParent('foreign-source', { realmId: foreignRealmId });
            const entity = seedParent('attached', { realmId, parentId: parent.id });

            await expect(service.update(entity.id, { parentId: null }, createRealmDenyingActor(foreignRealmId)))
                .rejects.toThrow(PermissionError);
            expect((await repository.findOneById(entity.id))?.parentId).toBe(parent.id);
        });

        it('should not evaluate the parent when an update keeps it', async () => {
            const realmId = randomUUID();
            const parent = seedParent('kept-parent', { realmId: randomUUID() });
            const entity = seedParent('kept-child', { realmId, parentId: parent.id });
            const actor = createAllowAllActor();

            await service.update(entity.id, { parentId: parent.id, name: 'kept-child-renamed' }, actor);

            expect(readEvaluatedRecordRealms(actor.permissionEvaluator, PermissionName.PERMISSION_UPDATE))
                .toEqual([realmId, realmId]);
        });

        it('should evaluate the create of a nested child in the child\'s realm', async () => {
            const realmId = randomUUID();
            const foreignRealmId = randomUUID();

            await expect(service.create({
                name: 'nested-parent',
                type: BuiltInPolicyType.COMPOSITE,
                realmId,
                children: [{
                    name: 'nested-foreign-child',
                    type: BuiltInPolicyType.COMPOSITE,
                    realmId: foreignRealmId,
                }],
            }, createRealmDenyingActor(foreignRealmId))).rejects.toThrow(PermissionError);
            expect(await repository.findOneBy({ name: 'nested-parent' })).toBeNull();
        });
        it('should evaluate the authority over a built-in parent before refusing it', async () => {
            const parent = seedParent('system-parent-unauthorized', { builtIn: true });

            await expect(service.create({
                name: 'attach-builtin-unauthorized',
                type: BuiltInPolicyType.COMPOSITE,
                realmId: randomUUID(),
                parentId: parent.id,
            }, createRealmDenyingActor(null))).rejects.toThrow(PermissionError);
        });

        it('should refuse updating a built-in policy before evaluating its parent', async () => {
            const foreignRealmId = randomUUID();
            const parent = seedParent('builtin-update-target', { realmId: foreignRealmId });
            const entity = seedParent('builtin-update', { builtIn: true });

            await expect(service.update(entity.id, { parentId: parent.id }, createRealmDenyingActor(foreignRealmId)))
                .rejects.toThrow(ValidationError);
        });

        it('should detach a child from a built-in parent with authority over the parent', async () => {
            const parent = seedParent('builtin-source', { builtIn: true });
            const entity = seedParent('planted', { realmId: randomUUID(), parentId: parent.id });

            const updated = await service.update(entity.id, { parentId: null }, createAllowAllActor());

            expect(updated.parentId).toBeNull();
        });

        it('should move a child away from a built-in parent with authority over both parents', async () => {
            const realmId = randomUUID();
            const parent = seedParent('builtin-move-source', { builtIn: true });
            const target = seedParent('builtin-move-target', { realmId });
            const entity = seedParent('planted-movable', { realmId, parentId: parent.id });

            const updated = await service.update(entity.id, { parentId: target.id }, createAllowAllActor());

            expect(updated.parentId).toBe(target.id);
        });

        it('should refuse detaching a child from a built-in parent without authority over it', async () => {
            const parent = seedParent('builtin-source-unauthorized', { builtIn: true });
            const entity = seedParent('planted-unauthorized', { realmId: randomUUID(), parentId: parent.id });

            await expect(service.update(entity.id, { parentId: null }, createRealmDenyingActor(null)))
                .rejects.toThrow(PermissionError);
            expect((await repository.findOneById(entity.id))?.parentId).toBe(parent.id);
        });

        it('should refuse deleting a child of a parent the actor cannot update', async () => {
            const realmId = randomUUID();
            const foreignRealmId = randomUUID();
            const parent = seedParent('delete-foreign-parent', { realmId: foreignRealmId });
            const entity = seedParent('delete-attached', { realmId, parentId: parent.id });

            await expect(service.delete(entity.id, createRealmDenyingActor(foreignRealmId)))
                .rejects.toThrow(PermissionError);
            expect(await repository.findOneById(entity.id)).not.toBeNull();
        });

        it('should evaluate the update of the parent in the parent\'s realm on delete', async () => {
            const realmId = randomUUID();
            const parentRealmId = randomUUID();
            const parent = seedParent('delete-parent', { realmId: parentRealmId });
            const entity = seedParent('delete-child', { realmId, parentId: parent.id });
            const actor = createAllowAllActor();

            await service.delete(entity.id, actor);

            expect(readEvaluatedRecordRealms(actor.permissionEvaluator, PermissionName.PERMISSION_UPDATE))
                .toEqual([parentRealmId]);
            expect(await repository.findOneById(entity.id)).toBeNull();
        });

        it('should delete a child of a built-in parent with authority over the parent', async () => {
            const parent = seedParent('delete-builtin-parent', { builtIn: true });
            const entity = seedParent('delete-planted', { realmId: randomUUID(), parentId: parent.id });

            await service.delete(entity.id, createAllowAllActor());

            expect(await repository.findOneById(entity.id)).toBeNull();
        });
    });

    describe('delete of a composite with descendants', () => {
        function seedNode(name: string, extra: Partial<Policy> = {}): Policy {
            return repository.seed({
                id: randomUUID(),
                name,
                type: BuiltInPolicyType.COMPOSITE,
                builtIn: false,
                invert: false,
                realmId: null,
                ...extra,
            } as Policy);
        }

        function createRealmBoundActor(realmId: string) {
            const permissionEvaluator = new FakePermissionEvaluator();

            permissionEvaluator.setBehavior((call) => {
                if (call.method !== 'evaluate') {
                    return;
                }

                if (call.ctx.data?.get(BuiltInPolicyType.REALM_MATCH) !== realmId) {
                    throw PermissionError.denied('test');
                }
            });

            return { permissionEvaluator };
        }

        it('should refuse a descendant in a foreign realm', async () => {
            const realmId = randomUUID();
            const root = seedNode('subtree-root', { realmId });
            const child = seedNode('subtree-child', { realmId, parentId: root.id });
            const foreign = seedNode('subtree-foreign', { realmId: randomUUID(), parentId: child.id });

            await expect(service.delete(root.id, createRealmBoundActor(realmId)))
                .rejects.toThrow(PermissionError);

            expect(await repository.findOneById(root.id)).not.toBeNull();
            expect(await repository.findOneById(child.id)).not.toBeNull();
            expect(await repository.findOneById(foreign.id)).not.toBeNull();
        });

        it('should refuse a global descendant at own reach', async () => {
            const realmId = randomUUID();
            const root = seedNode('global-root', { realmId });
            const global = seedNode('global-child', { realmId: null, parentId: root.id });

            await expect(service.delete(root.id, createRealmBoundActor(realmId)))
                .rejects.toThrow(PermissionError);

            expect(await repository.findOneById(root.id)).not.toBeNull();
            expect(await repository.findOneById(global.id)).not.toBeNull();
        });

        it('should delete an own-realm subtree, evaluating every node in its realm', async () => {
            const realmId = randomUUID();
            const root = seedNode('own-root', { realmId });
            const child = seedNode('own-child', { realmId, parentId: root.id });
            const grandchild = seedNode('own-grandchild', { realmId, parentId: child.id });
            const actor = createRealmBoundActor(realmId);

            await service.delete(root.id, actor);

            const deletes = actor.permissionEvaluator.evaluateCalls
                .filter((call) => call.name === PermissionName.PERMISSION_DELETE)
                .map((call) => (call.data!.get(BuiltInPolicyType.ATTRIBUTES) as Policy).id);

            expect(deletes).toEqual(expect.arrayContaining([root.id, child.id, grandchild.id]));
            expect(readEvaluatedRecordRealms(actor.permissionEvaluator, PermissionName.PERMISSION_DELETE))
                .toEqual([realmId, realmId, realmId]);
            expect(await repository.findOneById(root.id)).toBeNull();
            expect(await repository.findOneById(grandchild.id)).toBeNull();
        });

        describe('a child attached between the check and the delete', () => {
            const attachOnce = (child: () => Policy) => {
                let done = false;

                repository.beforeTransaction = () => {
                    if (done) {
                        return;
                    }

                    done = true;
                    child();
                };
            };

            it('should refuse the delete when the attached child is out of reach', async () => {
                const realmId = randomUUID();
                const root = seedNode('race-root', { realmId });

                let foreign: Policy | undefined;

                attachOnce(() => {
                    foreign = seedNode('race-foreign', { realmId: randomUUID(), parentId: root.id });

                    return foreign;
                });

                await expect(service.delete(root.id, createRealmBoundActor(realmId)))
                    .rejects.toThrow(PermissionError);

                expect(await repository.findOneById(root.id)).not.toBeNull();
                expect(await repository.findOneById(foreign!.id)).not.toBeNull();
            });

            it('should authorize the attached child and delete it with the subtree', async () => {
                const realmId = randomUUID();
                const root = seedNode('race-own-root', { realmId });

                let attached: Policy | undefined;

                attachOnce(() => {
                    attached = seedNode('race-own-child', { realmId, parentId: root.id });

                    return attached;
                });

                const actor = createRealmBoundActor(realmId);

                await service.delete(root.id, actor);

                const deletes = actor.permissionEvaluator.evaluateCalls
                    .filter((call) => call.name === PermissionName.PERMISSION_DELETE)
                    .map((call) => (call.data!.get(BuiltInPolicyType.ATTRIBUTES) as Policy).id);

                expect(deletes).toContain(attached!.id);
                expect(repository.transactionCalls).toBe(2);
                expect(await repository.findOneById(root.id)).toBeNull();
                expect(await repository.findOneById(attached!.id)).toBeNull();
            });

            it('should answer a conflict when the subtree never stabilizes', async () => {
                const realmId = randomUUID();
                const root = seedNode('race-busy-root', { realmId });

                let counter = 0;

                repository.beforeTransaction = () => {
                    counter += 1;
                    seedNode(`race-busy-child-${counter}`, { realmId, parentId: root.id });
                };

                await expect(service.delete(root.id, createRealmBoundActor(realmId)))
                    .rejects.toMatchObject({ code: ErrorCode.ENTITY_CONFLICT });

                expect(repository.transactionCalls).toBe(3);
                expect(await repository.findOneById(root.id)).not.toBeNull();
            });
        });

        it('should refuse a built-in descendant', async () => {
            const root = seedNode('builtin-root');
            const builtIn = seedNode('builtin-child', { builtIn: true, parentId: root.id });

            await expect(service.delete(root.id, createAllowAllActor()))
                .rejects.toThrow(ValidationError);

            expect(await repository.findOneById(root.id)).not.toBeNull();
            expect(await repository.findOneById(builtIn.id)).not.toBeNull();
        });
    });

    describe('realm defaulting', () => {
        it('should create a global row when realmId is absent', async () => {
            const result = await service.create({
                name: 'policy-no-realm',
                type: BuiltInPolicyType.COMPOSITE,
            }, createNonMasterRealmActor(randomUUID()));

            expect(result.realmId).toBeNull();
        });

        it('should treat realmId: null like an absent realmId', async () => {
            const actor = createMasterRealmActor();

            const absent = await service.create({ name: 'policy-absent', type: BuiltInPolicyType.COMPOSITE }, actor);
            const explicit = await service.create({
                name: 'policy-explicit',
                type: BuiltInPolicyType.COMPOSITE,
                realmId: null,
            }, actor);

            expect(absent.realmId).toBeNull();
            expect(explicit.realmId).toBeNull();
        });

        it('should evaluate the create gate against the global realm when realmId is absent', async () => {
            const actor = createMasterRealmActor();

            await service.create({ name: 'policy-gated', type: BuiltInPolicyType.COMPOSITE }, actor);

            expect(readEvaluatedRecordRealms(actor.permissionEvaluator, PermissionName.PERMISSION_CREATE).at(-1)).toBeNull();
        });
    });

    describe('stored options (#3669)', () => {
        it('should store no unlisted key for an identity policy', async () => {
            const entity = await service.create({
                name: 'identity-options',
                type: BuiltInPolicyType.IDENTITY,
                types: ['user'],
                foo: 'bar',
                builtIn: true,
            }, createAllowAllActor());

            const stored = await repository.findOneById(entity.id) as Record<string, any>;

            expect(stored.types).toEqual(['user']);
            expect(stored.foo).toBeUndefined();
            expect(stored.builtIn).toBeFalsy();
        });

        it('should store no unlisted key for a composite policy', async () => {
            const entity = await service.create({
                name: 'composite-options',
                type: BuiltInPolicyType.COMPOSITE,
                decisionStrategy: 'affirmative',
                foo: 'bar',
            }, createAllowAllActor());

            const stored = await repository.findOneById(entity.id) as Record<string, any>;

            expect(stored.decisionStrategy).toEqual('affirmative');
            expect(stored.foo).toBeUndefined();
        });

        it('should validate each child of a composite by its own type', async () => {
            const entity = await service.create({
                name: 'composite-children',
                type: BuiltInPolicyType.COMPOSITE,
                children: [
                    {
                        name: 'composite-child',
                        type: BuiltInPolicyType.IDENTITY,
                        types: ['user'],
                        foo: 'bar',
                    },
                ],
            }, createAllowAllActor()) as Record<string, any>;

            expect(entity.children[0].types).toEqual(['user']);
            expect(entity.children[0].foo).toBeUndefined();
        });

        it('should validate the children of a composite on update by its stored type', async () => {
            const entity = await service.create({
                name: 'composite-update',
                type: BuiltInPolicyType.COMPOSITE,
            }, createAllowAllActor());

            await expect(service.update(entity.id, {
                children: [{
                    name: 'custom-update-child',
                    type: 'custom',
                    foo: 'bar',
                }],
            }, createAllowAllActor())).rejects.toThrow(ValidationError);
        });

        it('should refuse an option on a composite child without a validator', async () => {
            await expect(service.create({
                name: 'composite-custom-child',
                type: BuiltInPolicyType.COMPOSITE,
                children: [{
                    name: 'custom-child',
                    type: 'custom',
                    foo: 'bar',
                }],
            }, createAllowAllActor())).rejects.toThrow(ValidationError);
        });

        it('should create a custom type without options', async () => {
            const entity = await service.create({
                name: 'custom-plain',
                type: 'custom',
                displayName: 'Custom',
                invert: false,
            }, createAllowAllActor());

            const stored = await repository.findOneById(entity.id) as Record<string, any>;

            expect(stored.type).toEqual('custom');
            expect(stored.displayName).toEqual('Custom');
        });

        it('should refuse an option for a type without a validator', async () => {
            await expect(service.create({
                name: 'custom-options',
                type: 'custom',
                foo: 'bar',
            }, createAllowAllActor())).rejects.toThrow(ValidationError);

            expect(await repository.findOneBy({ name: 'custom-options' })).toBeNull();
        });

        it('should store the options a registered custom validator declares', async () => {
            class CustomPolicyValidator extends Container<Record<string, any>> {
                override initialize() {
                    super.initialize();

                    this.mount('range', createValidator(z.string()));
                }
            }

            service = new PolicyService({
                repository,
                realmRepository: new FakeRealmRepository(),
                validators: {
                    ...PolicyDefaultValidators,
                    custom: new CustomPolicyValidator(),
                },
            });

            const entity = await service.create({
                name: 'custom-registered',
                type: 'custom',
                range: '10.0.0.0/8',
                foo: 'bar',
            }, createAllowAllActor());

            const stored = await repository.findOneById(entity.id) as Record<string, any>;

            expect(stored.range).toEqual('10.0.0.0/8');
            expect(stored.foo).toBeUndefined();
        });

        it('should store no option the request omits', async () => {
            const entity = await service.create({
                name: 'omitted-options',
                type: BuiltInPolicyType.DATE,
                start: '2020-01-01',
            }, createAllowAllActor());

            const stored = await repository.findOneById(entity.id) as Record<string, any>;

            expect(stored.start).toEqual('2020-01-01');
            expect(Object.keys(stored)).not.toContain('end');
        });

        it('should read an update by the stored type', async () => {
            const entity = await service.create({
                name: 'realm-match-options',
                type: BuiltInPolicyType.REALM_MATCH,
                realmId: null,
            }, createAllowAllActor());

            await service.update(entity.id, {
                attributeName: 'realmId',
                foo: 'bar',
            }, createAllowAllActor());

            const stored = await repository.findOneById(entity.id) as Record<string, any>;

            expect(stored.attributeName).toEqual('realmId');
            expect(stored.foo).toBeUndefined();
        });
    });

    describe('save by name scoped to a realm', () => {
        async function seedPair() {
            const master = await realmRepository.resolve(undefined, true);
            const seedEntity = (name: string, realmId: string | null) => repository.seed({
                id: randomUUID(),
                name,
                type: BuiltInPolicyType.COMPOSITE,
                builtIn: false,
                invert: false,
                realmId,
            } as Policy);
            // the realm row comes first, so an unscoped lookup would find it
            const scoped = seedEntity('name-scoped', master.id);
            const global = seedEntity('name-scoped', null);

            return {
                master,
                global,
                scoped,
            };
        }

        it('should address the global row when realmId is absent', async () => {
            const { global, scoped } = await seedPair();

            const { entity, created } = await service.save('name-scoped', { description: 'changed' }, createAllowAllActor());

            expect(created).toBe(false);
            expect(entity.id).toBe(global.id);
            expect(scoped.description).not.toBe('changed');
        });

        it('should address the global row when realmId is null', async () => {
            const { global } = await seedPair();

            const { entity } = await service.save('name-scoped', { description: 'changed', realmId: null }, createAllowAllActor());

            expect(entity.id).toBe(global.id);
        });

        it('should address the realm row when realmId is given', async () => {
            const { master, scoped } = await seedPair();

            const { entity } = await service.save('name-scoped', { description: 'changed', realmId: master.name }, createAllowAllActor());

            expect(entity.id).toBe(scoped.id);
        });

        it('should look a uuid key up by id alone', async () => {
            const { scoped } = await seedPair();

            const { entity } = await service.save(scoped.id, { description: 'changed' }, createAllowAllActor());

            expect(entity.id).toBe(scoped.id);
        });

        it('should refuse a realm key that does not resolve', async () => {
            await seedPair();

            await expect(
                service.save('name-scoped', { description: 'changed', realmId: 'unknown-realm' }, createAllowAllActor(), { updateOnly: true }),
            ).rejects.toMatchObject({ code: ErrorCode.BAD_REQUEST });
        });
    });
});
