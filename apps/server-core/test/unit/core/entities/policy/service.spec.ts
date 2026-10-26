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
