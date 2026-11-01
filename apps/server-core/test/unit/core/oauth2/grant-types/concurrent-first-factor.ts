/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { User } from '@authup/core-kit';
import { UserAuthenticatorKind } from '@authup/core-kit';
import { MemoryCache } from '@authup/server-kit';
import { vi } from 'vitest';
import { UserAuthenticatorService } from '../../../../../src/core/entities/user-authenticator/service.ts';
import type { IRealmCipher } from '../../../../../src/core/key/index.ts';
import { FakeUserAuthenticatorRepository } from '../../entities/user-authenticator/fake-repository.ts';
import { FakeUserRepository } from '../../entities/user/fake-repository.ts';
import type { FakeSessionManager } from '../../helpers/fake-session-manager.ts';

const cipher: IRealmCipher = {
    encrypt: async (plain) => `plain.${plain}`,
    decrypt: async (blob) => blob.replace(/^plain\./, ''),
};

/**
 * The login decided "no second factor owed" before the session insert; a
 * concurrent first enrollment stores a confirmed factor right after the
 * insert, i.e. after its own revocation listed the user's sessions.
 */
export function createConcurrentFirstFactor(
    sessionManager: FakeSessionManager,
    input: {
        userId: string, 
        realmId: string, 
        enabled?: boolean 
    },
) {
    const repository = new FakeUserAuthenticatorRepository();
    const userRepository = new FakeUserRepository();

    userRepository.seed({
        id: input.userId, 
        name: 'test-user', 
        realmId: input.realmId, 
    } as Partial<User>);

    const service = new UserAuthenticatorService({
        repository,
        userRepository,
        cache: new MemoryCache(),
        cipher,
        options: { enabled: input.enabled ?? true },
    });

    const lookups = vi.spyOn(repository, 'findAllByUser');

    const enrollAfterInsert = () => {
        const create = sessionManager.create.bind(sessionManager);

        sessionManager.create = async (session) => {
            const created = await create(session);

            repository.seed({
                userId: input.userId,
                realmId: input.realmId,
                kind: UserAuthenticatorKind.TOTP,
                confirmed: true,
            });

            return created;
        };
    };

    return {
        service,
        repository,
        lookups,
        enrollAfterInsert,
    };
}
