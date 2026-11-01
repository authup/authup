/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import { BuiltInPolicyType, PermissionError } from '@authup/access';
import type { Session, SessionToken } from '@authup/core-kit';
import { PermissionName } from '@authup/core-kit';
import { createMasterRealmActor } from '@authup/server-test-kit';
import {
    beforeEach,
    describe,
    expect,
    it,
} from 'vitest';
import { SessionTokenService } from '../../../../../src/core/entities/session-token/service.ts';
import { FakeSessionTokenRepository } from '../../helpers/fake-session-token-repository.ts';

class QueryableSessionTokenRepository extends FakeSessionTokenRepository {
    public listed: SessionToken[] = [];

    override async findMany() {
        return {
            data: [...this.listed],
            meta: { total: this.listed.length },
        } as any;
    }
}

async function seedToken(
    repository: FakeSessionTokenRepository,
    session?: Partial<Session>,
): Promise<SessionToken> {
    const row = await repository.create({
        id: randomUUID(),
        sessionId: randomUUID(),
        kind: 'access',
        ipAddress: '127.0.0.1',
        userAgent: 'test',
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
    });

    if (session) {
        row.session = {
            id: row.sessionId,
            sub: randomUUID(),
            subKind: 'user',
            realmId: randomUUID(),
            ...session,
        } as Session;
    }

    return row;
}

describe('core/entities/session-token/service', () => {
    let repository: QueryableSessionTokenRepository;
    let service: SessionTokenService;

    beforeEach(() => {
        repository = new QueryableSessionTokenRepository();
        service = new SessionTokenService({ repository });
    });

    it('denies a foreign token whose session did not load, even to an allow-all reader', async () => {
        const token = await seedToken(repository);

        await expect(service.getOne(token.id, createMasterRealmActor()))
            .rejects.toBeInstanceOf(PermissionError);
    });

    it('drops a listed token whose session did not load and decrements the total', async () => {
        const realmId = randomUUID();
        const loaded = await seedToken(repository, { realmId });
        const orphan = await seedToken(repository);

        repository.listed = [loaded, orphan];

        const actor = createMasterRealmActor();
        const result = await service.getMany({}, actor);

        expect(result.data.map((row) => row.id)).toEqual([loaded.id]);
        expect(result.meta.total).toEqual(1);

        const call = actor.permissionEvaluator.evaluateCalls.find(
            (c) => c.name === PermissionName.SESSION_READ,
        );

        expect(call!.data!.get(BuiltInPolicyType.REALM_MATCH)).toEqual(realmId);
    });

    it('propagates a non-permission failure of the per-row realm gate', async () => {
        repository.listed = [await seedToken(repository, {})];

        const actor = createMasterRealmActor();

        actor.permissionEvaluator.setBehavior(({ method }) => {
            if (method === 'evaluate') {
                throw new Error('provider unavailable');
            }
        });

        await expect(service.getMany({}, actor)).rejects.toThrow('provider unavailable');
    });
});
