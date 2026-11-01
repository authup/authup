/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import type { User } from '@authup/core-kit';
import { IdentityType, UserAuthenticatorKind } from '@authup/core-kit';
import { MemoryCache, createNoopLogger } from '@authup/server-kit';
import type { ActorContext, Logger } from '@authup/server-kit';
import { FakePermissionEvaluator } from '@authup/server-test-kit';
import { Secret, TOTP } from 'otpauth';
import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';
import type { IRealmCipher } from '../../../../../src/core/key/index.ts';
import { MailTemplateRenderer } from '../../../../../src/core/mail/index.ts';
import { UserAuthenticatorService } from '../../../../../src/core/entities/user-authenticator/service.ts';
import type * as WebauthnModule from '../../../../../src/core/entities/user-authenticator/webauthn.ts';
import { FakeMailClient, FakeSessionManager } from '../../helpers/index.ts';
import { FakeUserRepository } from '../user/fake-repository.ts';
import { FakeUserAuthenticatorRepository } from './fake-repository.ts';

vi.mock('../../../../../src/core/entities/user-authenticator/webauthn.ts', async (importOriginal) => {
    const original = await importOriginal<typeof WebauthnModule>();

    return {
        ...original,
        verifyWebauthnRegistration: vi.fn(async () => ({
            credential_id: 'credential',
            public_key: 'key',
            counter: 0,
            transports: [],
        })),
    };
});

const realmId = randomUUID();
const userId = randomUUID();
const adminId = randomUUID();

const ownSessionId = randomUUID();
const otherSessionId = randomUUID();
const adminSessionId = randomUUID();

function makeActor(id: string = userId): ActorContext {
    return {
        permissionEvaluator: new FakePermissionEvaluator(),
        identity: {
            type: IdentityType.USER,
            data: {
                id, 
                name: `user-${id}`, 
                realmId, 
            } as User,
        },
    };
}

const cipher: IRealmCipher = {
    encrypt: async (plain) => `plain.${plain}`,
    decrypt: async (blob) => blob.replace(/^plain\./, ''),
};

function totpCode(base32: string): string {
    return new TOTP({
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: Secret.fromBase32(base32),
    }).generate();
}

describe('UserAuthenticatorService: sessions predating the first factor', () => {
    let repository: FakeUserAuthenticatorRepository;
    let userRepository: FakeUserRepository;
    let sessionManager: FakeSessionManager;
    let requestSessionId: string;
    let logLines: string[];
    let service: UserAuthenticatorService;

    beforeEach(async () => {
        repository = new FakeUserAuthenticatorRepository();
        userRepository = new FakeUserRepository();
        userRepository.seed({
            id: userId,
            name: 'test-user',
            email: 'user@example.com',
            realmId,
        } as Partial<User>);

        sessionManager = new FakeSessionManager();
        await sessionManager.create({
            id: ownSessionId, 
            sub: userId, 
            subKind: IdentityType.USER, 
        });
        await sessionManager.create({
            id: otherSessionId, 
            sub: userId, 
            subKind: IdentityType.USER, 
        });
        await sessionManager.create({
            id: adminSessionId, 
            sub: adminId, 
            subKind: IdentityType.USER, 
        });

        requestSessionId = ownSessionId;

        logLines = [];

        const logger = createNoopLogger();

        logger.warn = ((message: unknown) => {
            logLines.push(String(message));

            return logger;
        }) as Logger['warn'];

        service = new UserAuthenticatorService({
            repository,
            userRepository,
            cache: new MemoryCache(),
            cipher,
            mailClient: new FakeMailClient(),
            mailTemplateRenderer: new MailTemplateRenderer(),
            sessionManager,
            logger,
            requestContext: () => ({
                actorType: IdentityType.USER,
                actorId: null,
                actorName: null,
                sessionId: requestSessionId,
                requestPath: null,
                requestMethod: null,
                requestIpAddress: null,
                requestUserAgent: null,
            }),
            options: {
                enabled: true,
                webauthn: {
                    rpId: 'localhost',
                    rpName: 'authup',
                    origin: 'http://localhost:3000',
                },
            },
        });
    });

    async function sessionIds() {
        const ids: string[] = [];

        for (const id of [ownSessionId, otherSessionId, adminSessionId]) {
            if (await sessionManager.findOneById(id)) {
                ids.push(id);
            }
        }

        return ids;
    }

    it('ends the other sessions when a first totp device is confirmed', async () => {
        const enrolled = await service.enroll({ kind: UserAuthenticatorKind.TOTP }, makeActor());

        expect(await sessionIds()).toEqual([ownSessionId, otherSessionId, adminSessionId]);

        await service.confirm(enrolled.data.id, totpCode(enrolled.meta.secret!), makeActor());

        expect(await sessionIds()).toEqual([ownSessionId, adminSessionId]);
    });

    it('ends the other sessions when a first webauthn device is confirmed', async () => {
        const enrolled = await service.enroll({ kind: UserAuthenticatorKind.WEBAUTHN }, makeActor());

        expect(await sessionIds()).toEqual([ownSessionId, otherSessionId, adminSessionId]);

        await service.confirm(enrolled.data.id, '{}', makeActor());

        expect(await sessionIds()).toEqual([ownSessionId, adminSessionId]);
    });

    it('ends the other sessions when a first recovery set is enrolled', async () => {
        await service.enroll({ kind: UserAuthenticatorKind.RECOVERY }, makeActor());

        expect(await sessionIds()).toEqual([ownSessionId, adminSessionId]);
    });

    it('ends the other sessions when a first email factor is enrolled', async () => {
        await service.enroll({ kind: UserAuthenticatorKind.EMAIL }, makeActor());

        expect(await sessionIds()).toEqual([ownSessionId, adminSessionId]);
    });

    it('ends every session of the user when another actor enrolls its first factor', async () => {
        requestSessionId = adminSessionId;

        await service.enroll({ kind: UserAuthenticatorKind.EMAIL, userId }, makeActor(adminId));

        expect(await sessionIds()).toEqual([adminSessionId]);
    });

    it('keeps the sessions when the user already holds a confirmed factor', async () => {
        await service.enroll({ kind: UserAuthenticatorKind.RECOVERY }, makeActor());

        await sessionManager.create({
            id: otherSessionId, 
            sub: userId, 
            subKind: IdentityType.USER, 
        });
        sessionManager.revokeByOwnerCalls = [];

        await service.enroll({ kind: UserAuthenticatorKind.RECOVERY }, makeActor());
        await service.enroll({ kind: UserAuthenticatorKind.EMAIL }, makeActor());

        const enrolled = await service.enroll({ kind: UserAuthenticatorKind.TOTP }, makeActor());

        await service.confirm(enrolled.data.id, totpCode(enrolled.meta.secret!), makeActor());

        expect(sessionManager.revokeByOwnerCalls).toEqual([]);
        expect(await sessionIds()).toEqual([ownSessionId, otherSessionId, adminSessionId]);
    });

    it('ends nothing for an enrollment that is not confirmed yet', async () => {
        await service.enroll({ kind: UserAuthenticatorKind.TOTP }, makeActor());
        await service.enroll({ kind: UserAuthenticatorKind.WEBAUTHN }, makeActor());

        expect(sessionManager.revokeByOwnerCalls).toEqual([]);
    });

    it('still answers the enrollment when the sessions cannot be revoked', async () => {
        vi.spyOn(sessionManager, 'revokeByOwner').mockRejectedValue(new Error('revoke failed'));

        const recovery = await service.enroll({ kind: UserAuthenticatorKind.RECOVERY }, makeActor());

        expect(recovery.meta.codes?.length).toBeGreaterThan(0);
        expect(await repository.hasConfirmedByUser(userId)).toBe(true);
        expect(logLines).toHaveLength(1);
        expect(logLines[0]).toContain('revoke failed');
    });

    it('still confirms a first device when the sessions cannot be revoked', async () => {
        vi.spyOn(sessionManager, 'revokeByOwner').mockRejectedValue(new Error('revoke failed'));

        const enrolled = await service.enroll({ kind: UserAuthenticatorKind.TOTP }, makeActor());
        const confirmed = await service.confirm(enrolled.data.id, totpCode(enrolled.meta.secret!), makeActor());

        expect(confirmed.confirmed).toBe(true);
        expect(logLines).toHaveLength(1);
        expect(logLines[0]).toContain('revoke failed');
    });
});
