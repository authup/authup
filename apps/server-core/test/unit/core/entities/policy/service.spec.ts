/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import { BuiltInPolicyType, PermissionError, PolicyDefaultValidators } from '@authup/access';
import { ValidationError } from '@authup/errors';
import { PermissionName } from '@authup/core-kit';
import type { Policy } from '@authup/core-kit';
import { FakePermissionEvaluator, createAllowAllActor } from '@authup/server-test-kit';
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
import { FakePolicyRepository } from './fake-repository.ts';

describe('core/entities/policy/service', () => {
    let repository: FakePolicyRepository;
    let service: PolicyService;

    beforeEach(() => {
        repository = new FakePolicyRepository();
        service = new PolicyService({ repository, realmRepository: new FakeRealmRepository() });
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
});
