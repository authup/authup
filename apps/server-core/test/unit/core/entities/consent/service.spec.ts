/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import { BuiltInPolicyType } from '@authup/access';
import type { Consent, User } from '@authup/core-kit';
import { IdentityType } from '@authup/core-kit';
import type { ActorContext } from '@authup/server-kit';
import {
    beforeEach,
    describe,
    expect,
    it,
} from 'vitest';
import { FakePermissionEvaluator, createAllowAllActor, createDenyAllActor } from '@authup/server-test-kit';
import { ConsentService } from '../../../../../src/core/entities/consent/service.ts';
import { FakeConsentRepository } from './fake-repository.ts';

const realmId = randomUUID();
const clientId = randomUUID();
const userId = randomUUID();
const otherUserId = randomUUID();

function withIdentity(actor: ActorContext, id: string = userId): ActorContext {
    actor.identity = {
        type: IdentityType.USER,
        data: {
            id,
            realm_id: realmId,
        } as User,
    };
    return actor;
}

describe('ConsentService', () => {
    let repository: FakeConsentRepository;
    let service: ConsentService;

    beforeEach(() => {
        repository = new FakeConsentRepository();
        service = new ConsentService({ repository });
    });

    const owner = () => ({ sub: userId, subKind: IdentityType.USER as string });

    function seedOwn(scope = 'global'): Consent {
        return repository.seed({
            client_id: clientId,
            realm_id: realmId,
            sub: userId,
            sub_kind: IdentityType.USER,
            scope,
        });
    }
    function seedOther(scope = 'global'): Consent {
        return repository.seed({
            client_id: clientId,
            realm_id: realmId,
            sub: otherUserId,
            sub_kind: IdentityType.USER,
            scope,
        });
    }

    describe('record', () => {
        it('inserts one row per requested scope token', async () => {
            await service.record({
                clientId,
                realmId,
                owner: owner(),
                scope: 'global openid',
            });

            const rows = repository.rows();
            expect(rows).toHaveLength(2);
            expect(rows.map((row) => row.scope).sort()).toEqual(['global', 'openid']);
            expect(rows.every((row) => row.client_id === clientId &&
                row.realm_id === realmId &&
                row.sub === userId &&
                row.sub_kind === IdentityType.USER)).toBe(true);
        });

        it('is idempotent on an identical re-record (union/keep, no duplicates)', async () => {
            await service.record({
                clientId, 
                realmId, 
                owner: owner(), 
                scope: 'global openid',
            });
            const before = repository.rows().map((row) => row.id).sort();

            await service.record({
                clientId, 
                realmId, 
                owner: owner(), 
                scope: 'global openid',
            });

            const after = repository.rows().map((row) => row.id).sort();
            expect(after).toEqual(before);
        });

        it('inserts only the missing tokens when the scope widens (existing rows untouched)', async () => {
            await service.record({
                clientId, 
                realmId, 
                owner: owner(), 
                scope: 'global',
            });
            const [original] = repository.rows();

            await service.record({
                clientId, 
                realmId, 
                owner: owner(), 
                scope: 'global openid',
            });

            const rows = repository.rows();
            expect(rows).toHaveLength(2);
            // the pre-existing row survives by identity — never delete/recreate
            expect(rows.find((row) => row.scope === 'global')!.id).toEqual(original.id);
            expect(rows.some((row) => row.scope === 'openid')).toBe(true);
        });

        it('lowercases scope tokens before persistence', async () => {
            await service.record({
                clientId, 
                realmId, 
                owner: owner(), 
                scope: 'Global OpenID',
            });

            expect(repository.rows().map((row) => row.scope).sort()).toEqual(['global', 'openid']);
        });

        it('deduplicates tokens within a single record call', async () => {
            await service.record({
                clientId, 
                realmId, 
                owner: owner(), 
                scope: 'global GLOBAL global',
            });

            expect(repository.rows()).toHaveLength(1);
            expect(repository.insertMissingCalls[0].scopes).toEqual(['global']);
        });

        it('no-ops on an empty scope', async () => {
            await service.record({
                clientId, 
                realmId, 
                owner: owner(), 
                scope: null,
            });
            await service.record({
                clientId, 
                realmId, 
                owner: owner(), 
                scope: '',
            });
            await service.record({
                clientId, 
                realmId, 
                owner: owner(), 
                scope: [],
            });

            expect(repository.insertMissingCalls).toHaveLength(0);
            expect(repository.rows()).toHaveLength(0);
        });

        it('drops a scope token that exceeds the column width, keeping its siblings', async () => {
            const overLong = 'x'.repeat(200);
            await service.record({
                clientId,
                realmId,
                owner: owner(),
                scope: `global ${overLong} openid`,
            });

            const scopes = repository.rows().map((row) => row.scope).sort();
            expect(scopes).toEqual(['global', 'openid']);
            expect(scopes).not.toContain(overLong);
        });
    });

    describe('isCovering', () => {
        it('is true when every requested token has a row (exact match)', async () => {
            seedOwn('global');
            seedOwn('openid');

            await expect(service.isCovering({
                clientId, 
                owner: owner(), 
                scope: 'global openid',
            })).resolves.toBe(true);
        });

        it('is true when the persisted rows are a superset of the request', async () => {
            seedOwn('global');
            seedOwn('openid');
            seedOwn('email');

            await expect(service.isCovering({
                clientId, 
                owner: owner(), 
                scope: 'openid',
            })).resolves.toBe(true);
        });

        it('normalizes the requested tokens (mixed case covers lowercase rows)', async () => {
            seedOwn('global');
            seedOwn('openid');

            await expect(service.isCovering({
                clientId, 
                owner: owner(), 
                scope: 'Global OpenID',
            })).resolves.toBe(true);
        });

        it('is false when a requested token has no row', async () => {
            seedOwn('global');

            await expect(service.isCovering({
                clientId, 
                owner: owner(), 
                scope: 'global openid',
            })).resolves.toBe(false);
        });

        it('is false when the matching row is expired', async () => {
            seedOwn('global');
            repository.seed({
                client_id: clientId,
                realm_id: realmId,
                sub: userId,
                sub_kind: IdentityType.USER,
                scope: 'openid',
                expires_at: new Date(Date.now() - 1_000).toISOString(),
            });

            await expect(service.isCovering({
                clientId, 
                owner: owner(), 
                scope: 'global openid',
            })).resolves.toBe(false);
        });

        it('honors an unexpired (future) expires_at', async () => {
            repository.seed({
                client_id: clientId,
                realm_id: realmId,
                sub: userId,
                sub_kind: IdentityType.USER,
                scope: 'global',
                expires_at: new Date(Date.now() + 60_000).toISOString(),
            });

            await expect(service.isCovering({
                clientId, 
                owner: owner(), 
                scope: 'global',
            })).resolves.toBe(true);
        });

        it('is true (vacuous) on an empty requested scope', async () => {
            await expect(service.isCovering({
                clientId, 
                owner: owner(), 
                scope: null,
            })).resolves.toBe(true);
        });

        it("never covers via another subject's rows", async () => {
            seedOther('global');

            await expect(service.isCovering({
                clientId, 
                owner: owner(), 
                scope: 'global',
            })).resolves.toBe(false);
        });
    });

    describe('getMany', () => {
        it('scopes a non-privileged actor to its own consents', async () => {
            seedOwn('global');
            seedOwn('openid');
            seedOther('global');

            const actor = withIdentity(createDenyAllActor());
            const { data } = await service.getMany({}, actor);

            expect(data).toHaveLength(2);
            expect(data.every((consent) => consent.sub === userId)).toBe(true);

            // the owner constraint is mandatory — applied by the repository
            const [call] = repository.findManyCalls;
            expect(call.options.owner).toEqual({ sub: userId, subKind: IdentityType.USER });
        });

        it('rejects an anonymous (identity-less) actor without the read permission', async () => {
            const actor = createDenyAllActor();
            await expect(service.getMany({}, actor)).rejects.toBeDefined();
        });

        it('drops rows a privileged actor is not authorized for (realm reach)', async () => {
            seedOwn('global');
            const foreign = seedOther('global');
            repository.seed({
                client_id: clientId,
                realm_id: randomUUID(),
                sub: otherUserId,
                sub_kind: IdentityType.USER,
                scope: 'openid',
            });

            // preEvaluate (gate) passes; the per-row evaluate denies whenever
            // the resource realm is outside the actor's own realm.
            const evaluator = new FakePermissionEvaluator();
            evaluator.setBehavior((call) => {
                if (call.method !== 'evaluate') {
                    return;
                }
                const resourceRealm = call.ctx.data?.has(BuiltInPolicyType.REALM_MATCH) ?
                    call.ctx.data.get(BuiltInPolicyType.REALM_MATCH) :
                    undefined;
                if (resourceRealm !== realmId) {
                    throw new Error('out of realm reach');
                }
            });
            const actor: ActorContext = {
                permissionEvaluator: evaluator,
                identity: { type: IdentityType.USER, data: { id: userId, realm_id: realmId } as User },
            };

            const { data, meta } = await service.getMany({}, actor);

            expect(data).toHaveLength(2);
            expect(data.some((consent) => consent.sub === userId)).toBe(true);
            expect(data.some((consent) => consent.id === foreign.id)).toBe(true);
            expect(meta.total).toEqual(2);
        });
    });

    describe('getOne', () => {
        it('returns an own consent with no permission check', async () => {
            const consent = seedOwn();
            const actor = withIdentity(createDenyAllActor());

            const result = await service.getOne(consent.id, actor);
            expect(result.id).toEqual(consent.id);
            expect((actor.permissionEvaluator as FakePermissionEvaluator).preEvaluateCalls).toHaveLength(0);
        });

        it("denies reading another subject's consent without permission", async () => {
            const consent = seedOther();
            const actor = withIdentity(createDenyAllActor());

            await expect(service.getOne(consent.id, actor)).rejects.toBeDefined();
        });

        it("allows a privileged actor to read another subject's consent", async () => {
            const consent = seedOther();
            const actor = withIdentity(createAllowAllActor());

            const result = await service.getOne(consent.id, actor);
            expect(result.id).toEqual(consent.id);
        });

        it('throws when the consent does not exist', async () => {
            const actor = withIdentity(createAllowAllActor());
            await expect(service.getOne(randomUUID(), actor)).rejects.toBeDefined();
        });
    });

    describe('delete', () => {
        it('revokes an own consent with no permission check', async () => {
            const consent = seedOwn();
            const actor = withIdentity(createDenyAllActor());

            await service.delete(consent.id, actor);
            expect(repository.removeCalls.map((row) => row.id)).toContain(consent.id);
        });

        it("denies revoking another subject's consent without permission", async () => {
            const consent = seedOther();
            const actor = withIdentity(createDenyAllActor());

            await expect(service.delete(consent.id, actor)).rejects.toBeDefined();
            expect(repository.removeCalls).toHaveLength(0);
        });

        it("allows a privileged actor to revoke another subject's consent", async () => {
            const consent = seedOther();
            const actor = withIdentity(createAllowAllActor());

            await service.delete(consent.id, actor);
            expect(repository.removeCalls.map((row) => row.id)).toContain(consent.id);
        });

        it('throws when the consent does not exist', async () => {
            const actor = withIdentity(createAllowAllActor());
            await expect(service.delete(randomUUID(), actor)).rejects.toBeDefined();
            expect(repository.removeCalls).toHaveLength(0);
        });
    });
});
