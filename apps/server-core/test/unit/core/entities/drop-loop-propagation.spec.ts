/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import type { ClientPermission, Permission, User } from '@authup/core-kit';
import { EventName, EventScope, IdentityType } from '@authup/core-kit';
import {
    describe,
    expect,
    it,
} from 'vitest';
import type { FakeActorContext } from '@authup/server-test-kit';
import { FakeEntityRepository, FakePermissionEvaluator } from '@authup/server-test-kit';
import { SessionManager } from '../../../../src/core/authentication/session/module.ts';
import { ClientPermissionService } from '../../../../src/core/entities/client-permission/service.ts';
import { ClientService } from '../../../../src/core/entities/client/service.ts';
import { ConsentService } from '../../../../src/core/entities/consent/service.ts';
import { EventService } from '../../../../src/core/entities/event/service.ts';
import { IdentityProviderAccountService } from '../../../../src/core/entities/identity-provider-account/service.ts';
import { RoleService } from '../../../../src/core/entities/role/service.ts';
import { ScopeService } from '../../../../src/core/entities/scope/service.ts';
import { SessionService } from '../../../../src/core/entities/session/service.ts';
import { createFakeClient, createFakeRole, createFakeScope } from '../../../utils/domains/index.ts';
import { FakeEventService, FakeIdentityPermissionProvider } from '../helpers/index.ts';
import { createFakeRealmCipher } from '../helpers/realm-cipher.ts';
import { FakeClientRepository } from './client/fake-repository.ts';
import { FakeConsentRepository } from './consent/fake-repository.ts';
import { FakeEventRepository } from './event/fake-repository.ts';
import { FakeIdentityProviderAccountRepository } from './identity-provider-account/fake-repository.ts';
import { FakeUserIdentityRepository } from './identity-provider-account/fake-user-repository.ts';
import { FakeRealmRepository } from './realm/fake-repository.ts';
import { FakeRoleRepository } from './role/fake-repository.ts';
import { FakeScopeRepository } from './scope/fake-repository.ts';
import { FakeSessionRepository } from './session/fake-repository.ts';

/*
 * A `post` verdict sends every list below through a per-row record check. Only a
 * permission denial may drop a row there: anything else (a grant load failing, a
 * missing realm column) must fail the request, or a broken check silently
 * narrows a list to nothing.
 */

const realmId = randomUUID();
const otherUserId = randomUUID();

function createActor(): FakeActorContext {
    const evaluator = new FakePermissionEvaluator();

    evaluator.setCompileResult({ verdict: 'post' });
    evaluator.setBehavior(({ method }) => {
        if (method === 'evaluate' || method === 'evaluateOneOf') {
            throw new Error('provider unavailable');
        }
    });

    return {
        permissionEvaluator: evaluator,
        identity: {
            type: IdentityType.USER,
            data: {
                id: randomUUID(),
                realmId,
                name: 'actor',
            } as User,
        },
    };
}

type Case = [string, () => (actor: FakeActorContext) => Promise<unknown>];

const cases: Case[] = [
    ['role getMany', () => {
        const repository = new FakeRoleRepository();

        repository.seed([createFakeRole({ realmId })]);

        const service = new RoleService({ repository, realmRepository: new FakeRealmRepository() });

        return (actor) => service.getMany({}, actor);
    }],
    ['scope getMany', () => {
        const repository = new FakeScopeRepository();

        repository.seed([createFakeScope({ realmId })]);

        const service = new ScopeService({ repository, realmRepository: new FakeRealmRepository() });

        return (actor) => service.getMany({}, actor);
    }],
    ['event getMany', () => {
        const repository = new FakeEventRepository();

        repository.seed({
            scope: EventScope.OAUTH2,
            name: EventName.LOGIN,
            actorType: IdentityType.USER,
            actorId: otherUserId,
            realmId,
        });

        const service = new EventService({ repository });

        return (actor) => service.getMany({}, actor);
    }],
    ['session getMany', () => {
        const repository = new FakeSessionRepository();

        repository.seed({
            sub: otherUserId,
            subKind: IdentityType.USER,
            userId: otherUserId,
            realmId,
        });

        const sessionManager = new SessionManager({ repository, options: { maxAge: 3_600 } });
        const service = new SessionService({ repository, sessionManager });

        return (actor) => service.getMany({}, actor);
    }],
    ['session deleteMany (by query)', () => {
        const repository = new FakeSessionRepository();

        repository.seed({
            sub: otherUserId,
            subKind: IdentityType.USER,
            userId: otherUserId,
            realmId,
        });

        const sessionManager = new SessionManager({ repository, options: { maxAge: 3_600 } });
        const service = new SessionService({ repository, sessionManager });

        return (actor) => service.deleteMany(actor, { query: { filter: { userId: otherUserId } } });
    }],
    ['identity-provider-account getMany', () => {
        const repository = new FakeIdentityProviderAccountRepository();

        repository.seed({
            providerId: randomUUID(),
            providerUserId: 'external',
            userId: otherUserId,
            userRealmId: realmId,
        });

        const service = new IdentityProviderAccountService({
            repository,
            userRepository: new FakeUserIdentityRepository(),
            eventService: new FakeEventService(),
        });

        return (actor) => service.getMany({}, actor);
    }],
    ['client getMany', () => {
        const repository = new FakeClientRepository();

        repository.seed([createFakeClient({ realmId })]);

        const service = new ClientService({
            repository,
            realmRepository: new FakeRealmRepository(),
            cipher: createFakeRealmCipher(realmId),
        });

        return (actor) => service.getMany({}, actor);
    }],
    ['consent getMany', () => {
        const repository = new FakeConsentRepository();

        repository.seed({
            clientId: randomUUID(),
            realmId,
            sub: otherUserId,
            subKind: IdentityType.USER,
            scope: 'global',
        });

        const service = new ConsentService({ repository });

        return (actor) => service.getMany({}, actor);
    }],
    ['client-permission getMany', () => {
        const repository = new FakeEntityRepository<ClientPermission>();

        repository.seed({ clientRealmId: realmId } as Partial<ClientPermission>);

        const service = new ClientPermissionService({
            repository,
            permissionRepository: new FakeEntityRepository<Permission>(),
            identityPermissionProvider: new FakeIdentityPermissionProvider(),
        });

        return (actor) => service.getMany({}, actor);
    }],
];

describe('per-row drop loops on a post verdict', () => {
    it.each(cases)('%s propagates a non-permission failure of the record check', async (_, setup) => {
        const run = setup();

        await expect(run(createActor())).rejects.toThrow('provider unavailable');
    });
});
