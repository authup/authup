/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import type { User } from '@authup/core-kit';
import { EventName, EventRefType, IdentityType } from '@authup/core-kit';
import type { ActorContext } from '@authup/server-kit';
import {
    beforeEach,
    describe,
    expect,
    it,
} from 'vitest';
import type { FakePermissionEvaluator } from '@authup/server-test-kit';
import { createAllowAllActor, createDenyAllActor } from '@authup/server-test-kit';
import { EntityNotFoundError } from '@authup/errors';
import { IdentityProviderAccountService } from '../../../../../src/core/entities/identity-provider-account/service.ts';
import { IdentityProviderAccountUnlinkBlockedError } from '../../../../../src/core/entities/identity-provider-account/error.ts';
import { FakeEventService } from '../../helpers/index.ts';
import { FakeIdentityProviderAccountRepository } from './fake-repository.ts';
import { FakeUserIdentityRepository } from './fake-user-repository.ts';

const realmId = randomUUID();
const otherRealmId = randomUUID();
const providerId = randomUUID();
const userId = randomUUID();
const otherUserId = randomUUID();
const requestSessionId = 'f3b0dc71-0000-4000-8000-000000000006';

function withIdentity(
    actor: ActorContext,
    id: string = userId,
    type: `${IdentityType}` = IdentityType.USER,
): ActorContext {
    actor.identity = {
        type,
        data: {
            id,
            realmId,
        } as User,
    } as ActorContext['identity'];
    return actor;
}

describe('IdentityProviderAccountService', () => {
    let repository: FakeIdentityProviderAccountRepository;
    let userRepository: FakeUserIdentityRepository;
    let eventService: FakeEventService;
    let service: IdentityProviderAccountService;

    beforeEach(() => {
        repository = new FakeIdentityProviderAccountRepository();
        userRepository = new FakeUserIdentityRepository();
        eventService = new FakeEventService();
        service = new IdentityProviderAccountService({
            repository,
            userRepository,
            eventService,
            requestContext: () => ({
                actorType: null,
                actorId: null,
                actorName: null,
                sessionId: requestSessionId,
                requestPath: null,
                requestMethod: null,
                requestIpAddress: null,
                requestUserAgent: null,
            }),
        });
    });

    function seedOwn() {
        return repository.seed({
            providerId,
            providerUserId: 'external-own',
            userId,
            userRealmId: realmId,
        });
    }

    function seedForeign(foreignRealmId: string = realmId) {
        return repository.seed({
            providerId,
            providerUserId: 'external-foreign',
            userId: otherUserId,
            userRealmId: foreignRealmId,
        });
    }

    describe('getMany', () => {
        it('force-scopes an actor without read permission to its own rows', async () => {
            seedOwn();
            seedForeign();

            const actor = withIdentity(createDenyAllActor());
            const result = await service.getMany({}, actor);

            expect(result.data).toHaveLength(1);
            expect(result.data[0].userId).toEqual(userId);
            expect(repository.findManyCalls[0].options.userId).toEqual(userId);
        });

        it('rethrows for a permission-less non-user identity', async () => {
            const actor = withIdentity(createDenyAllActor(), userId, IdentityType.CLIENT);

            await expect(service.getMany({}, actor)).rejects.toBeDefined();
        });

        it('returns every row for a permitted actor', async () => {
            seedOwn();
            seedForeign();

            const actor = withIdentity(createAllowAllActor());
            const result = await service.getMany({}, actor);

            expect(result.data).toHaveLength(2);
            expect(result.meta.total).toEqual(2);
        });

        it('drops rows the per-row evaluation rejects and decrements total', async () => {
            seedOwn();
            seedForeign();

            const actor = withIdentity(createAllowAllActor());
            (actor.permissionEvaluator as FakePermissionEvaluator).deny('evaluate');

            const result = await service.getMany({}, actor);

            // the own row bypasses evaluation; the foreign row drops
            expect(result.data).toHaveLength(1);
            expect(result.data[0].userId).toEqual(userId);
            expect(result.meta.total).toEqual(1);
        });
    });

    describe('getOne', () => {
        it('returns an own row without any permission', async () => {
            const entity = seedOwn();

            const actor = withIdentity(createDenyAllActor());
            const result = await service.getOne(entity.id, actor);

            expect(result.id).toEqual(entity.id);
        });

        it('requires the read permission for a foreign row', async () => {
            const entity = seedForeign();

            const actor = withIdentity(createDenyAllActor());
            await expect(service.getOne(entity.id, actor)).rejects.toBeDefined();
        });

        it('fails not-found on a realm-mismatched nested read', async () => {
            const entity = seedOwn();

            const actor = withIdentity(createAllowAllActor());
            await expect(service.getOne(entity.id, actor, { realmId: otherRealmId }))
                .rejects.toBeInstanceOf(EntityNotFoundError);
        });
    });

    describe('delete', () => {
        it('deletes an own row without any permission', async () => {
            userRepository.seed({
                id: userId, 
                realmId, 
                password: 'hashed', 
            } as Partial<User>);
            const entity = seedOwn();

            const actor = withIdentity(createDenyAllActor());
            const result = await service.delete(entity.id, actor);

            expect(result.id).toEqual(entity.id);
            expect(repository.removeCalls).toHaveLength(1);
        });

        it('requires the delete permission for a foreign row', async () => {
            const entity = seedForeign();

            const actor = withIdentity(createDenyAllActor());
            await expect(service.delete(entity.id, actor)).rejects.toBeDefined();
            expect(repository.removeCalls).toHaveLength(0);
        });

        it('blocks unlinking the last account of a password-less user', async () => {
            userRepository.seed({
                id: userId, 
                realmId, 
                password: null, 
            } as Partial<User>);
            const entity = seedOwn();

            const actor = withIdentity(createDenyAllActor());
            await expect(service.delete(entity.id, actor))
                .rejects.toBeInstanceOf(IdentityProviderAccountUnlinkBlockedError);
            expect(repository.removeCalls).toHaveLength(0);
        });

        it('blocks an admin the same way', async () => {
            userRepository.seed({
                id: otherUserId, 
                realmId, 
                password: null, 
            } as Partial<User>);
            const entity = seedForeign();

            const actor = withIdentity(createAllowAllActor());
            await expect(service.delete(entity.id, actor))
                .rejects.toBeInstanceOf(IdentityProviderAccountUnlinkBlockedError);
            expect(repository.removeCalls).toHaveLength(0);
        });

        it('allows unlinking when the user has a password', async () => {
            userRepository.seed({
                id: userId, 
                realmId, 
                password: 'hashed', 
            } as Partial<User>);
            const entity = seedOwn();

            const actor = withIdentity(createDenyAllActor());
            await service.delete(entity.id, actor);

            expect(repository.removeCalls).toHaveLength(1);
        });

        it('allows unlinking when another linked account remains', async () => {
            userRepository.seed({
                id: userId, 
                realmId, 
                password: null, 
            } as Partial<User>);
            const entity = seedOwn();
            repository.seed({
                providerId: randomUUID(),
                providerUserId: 'external-own-2',
                userId,
                userRealmId: realmId,
            });

            const actor = withIdentity(createDenyAllActor());
            await service.delete(entity.id, actor);

            expect(repository.removeCalls).toHaveLength(1);
        });

        it('records an unlink event attributed to the acting session', async () => {
            userRepository.seed({
                id: userId,
                realmId,
                password: 'hashed',
            } as Partial<User>);
            const entity = seedOwn();

            const actor = withIdentity(createDenyAllActor());
            await service.delete(entity.id, actor);

            expect(eventService.recordCalls).toHaveLength(1);
            const [call] = eventService.recordCalls;
            expect(call).toMatchObject({
                name: EventName.IDENTITY_PROVIDER_UNLINKED,
                refType: EventRefType.IDENTITY_PROVIDER_ACCOUNT,
                refId: entity.id,
                actorId: userId,
                sessionId: requestSessionId,
                data: { providerId },
            });
        });

        it('fails not-found on a realm-mismatched nested delete', async () => {
            const entity = seedOwn();

            const actor = withIdentity(createAllowAllActor());
            await expect(service.delete(entity.id, actor, { realmId: otherRealmId }))
                .rejects.toBeInstanceOf(EntityNotFoundError);
        });
    });
});
