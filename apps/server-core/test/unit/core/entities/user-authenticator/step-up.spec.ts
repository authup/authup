/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import type { Session, User } from '@authup/core-kit';
import { IdentityType, SessionAuthMethod, UserAuthenticatorKind } from '@authup/core-kit';
import { isOAuth2MfaRequiredError } from '@authup/specs';
import { MemoryCache } from '@authup/server-kit';
import type { ActorContext } from '@authup/server-kit';
import { FakePermissionEvaluator } from '@authup/server-test-kit';
import { Secret, TOTP } from 'otpauth';
import {
    beforeEach,
    describe,
    expect,
    it,
} from 'vitest';
import type { IRealmCipher } from '../../../../../src/core/key/index.ts';
import { MailTemplateRenderer } from '../../../../../src/core/mail/index.ts';
import { UserAuthenticatorService } from '../../../../../src/core/entities/user-authenticator/service.ts';
import type { UserAuthenticatorServiceOptions } from '../../../../../src/core/entities/user-authenticator/types.ts';
import { FakeMailClient, FakeSessionManager } from '../../helpers/index.ts';
import { FakeUserRepository } from '../user/fake-repository.ts';
import { FakeUserAuthenticatorRepository } from './fake-repository.ts';

const realmId = randomUUID();
const userId = randomUUID();
const adminId = randomUUID();

const cipher: IRealmCipher = {
    encrypt: async (plain) => `plain.${plain}`,
    decrypt: async (blob) => blob.replace(/^plain\./, ''),
};

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

function totpCode(base32: string): string {
    return new TOTP({
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: Secret.fromBase32(base32),
    }).generate();
}

describe('UserAuthenticatorService: managing factors once one is held', () => {
    let repository: FakeUserAuthenticatorRepository;
    let userRepository: FakeUserRepository;
    let sessionManager: FakeSessionManager;
    let requestSessionId: string | null;
    let service: UserAuthenticatorService;

    function build(options: UserAuthenticatorServiceOptions = { enabled: true }) {
        return new UserAuthenticatorService({
            repository,
            userRepository,
            cache: new MemoryCache(),
            cipher,
            mailClient: new FakeMailClient(),
            mailTemplateRenderer: new MailTemplateRenderer(),
            sessionManager,
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
            options,
        });
    }

    async function useSession(session: Partial<Session> = {}) {
        const created = await sessionManager.create({
            sub: userId,
            subKind: IdentityType.USER,
            authMethod: SessionAuthMethod.PASSWORD,
            mfaAt: null,
            ...session,
        });

        requestSessionId = created.id;

        return created;
    }

    function seedFactor(kind: `${UserAuthenticatorKind}` = UserAuthenticatorKind.EMAIL, owner = userId) {
        return repository.seed({
            userId: owner,
            realmId,
            kind,
            confirmed: true,
        });
    }

    async function expectStepUp(promise: Promise<unknown>) {
        const error = await promise.catch((e) => e);

        expect(isOAuth2MfaRequiredError(error)).toBe(true);
    }

    beforeEach(() => {
        repository = new FakeUserAuthenticatorRepository();
        userRepository = new FakeUserRepository();
        userRepository.seed({
            id: userId,
            name: 'test-user',
            email: 'user@example.com',
            realmId,
        } as Partial<User>);
        userRepository.seed({
            id: adminId,
            name: 'admin',
            realmId,
        } as Partial<User>);

        sessionManager = new FakeSessionManager();
        requestSessionId = null;
        service = build();
    });

    describe('without a confirmed factor', () => {
        it('should let an unproven session enroll', async () => {
            await useSession();

            const result = await service.enroll({ kind: UserAuthenticatorKind.RECOVERY }, makeActor());

            expect(result.meta.codes?.length).toBeGreaterThan(0);
        });

        it('should let a request without a session enroll', async () => {
            const result = await service.enroll({ kind: UserAuthenticatorKind.TOTP }, makeActor());

            expect(result.meta.secret).toBeDefined();
        });
    });

    describe('with a confirmed factor and a session that proved one', () => {
        beforeEach(async () => {
            seedFactor();
            await useSession({ mfaAt: new Date().toISOString() });
        });

        it('should enroll, regenerate recovery codes and delete', async () => {
            const totp = await service.enroll({ kind: UserAuthenticatorKind.TOTP }, makeActor());
            const confirmed = await service.confirm(totp.data.id, totpCode(totp.meta.secret!), makeActor());

            expect(confirmed.confirmed).toBe(true);

            await service.enroll({ kind: UserAuthenticatorKind.RECOVERY }, makeActor());

            const regenerated = await service.enroll({ kind: UserAuthenticatorKind.RECOVERY }, makeActor());

            expect(regenerated.meta.codes?.length).toBeGreaterThan(0);

            const deleted = await service.delete(totp.data.id, makeActor());

            expect(deleted.id).toEqual(totp.data.id);
        });
    });

    describe('with a confirmed factor and a local session that proved none', () => {
        let device: Awaited<ReturnType<typeof seedFactor>>;

        beforeEach(async () => {
            device = seedFactor();
            await useSession();
        });

        it('should refuse to enroll another factor', async () => {
            await expectStepUp(service.enroll({ kind: UserAuthenticatorKind.TOTP }, makeActor()));
            await expectStepUp(service.enroll({ kind: UserAuthenticatorKind.EMAIL }, makeActor()));

            expect(await repository.findAllByUser(userId)).toHaveLength(1);
        });

        it('should refuse to regenerate the recovery codes', async () => {
            await expectStepUp(service.enroll({ kind: UserAuthenticatorKind.RECOVERY }, makeActor()));

            expect(await repository.findAllByUser(userId)).toHaveLength(1);
        });

        it('should refuse to delete a device', async () => {
            await expectStepUp(service.delete(device.id, makeActor()));

            expect(await repository.findOneById(device.id)).not.toBeNull();
        });

        it('should refuse to confirm a pending device', async () => {
            const pending = repository.seed({
                userId,
                realmId,
                kind: UserAuthenticatorKind.TOTP,
                confirmed: false,
                secret: `plain.${new Secret({ size: 20 }).base32}`,
            });

            await expectStepUp(service.confirm(pending.id, '000000', makeActor()));

            expect((await repository.findOneById(pending.id))?.confirmed).toBe(false);
        });

        it('should refuse a pre-column session that carries no method', async () => {
            await useSession({ authMethod: null });

            await expectStepUp(service.delete(device.id, makeActor()));
        });

        it('should refuse a session of another subject', async () => {
            await useSession({ sub: adminId, mfaAt: new Date().toISOString() });

            await expectStepUp(service.delete(device.id, makeActor()));
        });
    });

    describe('with a confirmed factor and no session', () => {
        it('should refuse to delete a device', async () => {
            const device = seedFactor();

            await expectStepUp(service.delete(device.id, makeActor()));

            expect(await repository.findOneById(device.id)).not.toBeNull();
        });

        it('should refuse when the session is gone', async () => {
            const device = seedFactor();

            requestSessionId = randomUUID();

            await expectStepUp(service.delete(device.id, makeActor()));
        });
    });

    it('should let an externally authenticated session manage factors', async () => {
        const device = seedFactor();

        await useSession({ authMethod: SessionAuthMethod.EXTERNAL });

        await service.enroll({ kind: UserAuthenticatorKind.RECOVERY }, makeActor());
        await service.delete(device.id, makeActor());

        expect(await repository.findOneById(device.id)).toBeNull();
    });

    it('should let an administrator manage another user\'s factors', async () => {
        const device = seedFactor(UserAuthenticatorKind.TOTP);

        await useSession({ sub: adminId });

        await service.enroll({ kind: UserAuthenticatorKind.EMAIL, userId }, makeActor(adminId));
        await service.delete(device.id, makeActor(adminId));

        expect(await repository.findOneById(device.id)).toBeNull();
    });

    it('should not gate a deployment with mfa disabled', async () => {
        service = build({ enabled: false });

        const device = seedFactor();

        await service.delete(device.id, makeActor());

        expect(await repository.findOneById(device.id)).toBeNull();
    });

    describe('the session a first factor is set up from', () => {
        it('should stay unproven until it passes a challenge', async () => {
            const session = await useSession();

            const totp = await service.enroll({ kind: UserAuthenticatorKind.TOTP }, makeActor());

            await service.confirm(totp.data.id, totpCode(totp.meta.secret!), makeActor());

            expect((await sessionManager.findOneById(session.id))?.mfaAt).toBeFalsy();
            await expectStepUp(service.enroll({ kind: UserAuthenticatorKind.RECOVERY }, makeActor()));

            await sessionManager.markMfaVerified(session);

            const recovery = await service.enroll({ kind: UserAuthenticatorKind.RECOVERY }, makeActor());

            expect(recovery.meta.codes?.length).toBeGreaterThan(0);
        });
    });
    describe('a first factor confirmed by a concurrent request', () => {
        function confirmConcurrently() {
            repository.beforeWrite = () => {
                seedFactor(UserAuthenticatorKind.TOTP);
            };
        }

        it('should refuse to hand an unproven session recovery codes', async () => {
            await useSession();
            confirmConcurrently();

            await expectStepUp(service.enroll({ kind: UserAuthenticatorKind.RECOVERY }, makeActor()));

            const recovery = (await repository.findAllByUser(userId))
                .filter((entity) => entity.kind === UserAuthenticatorKind.RECOVERY);

            expect(recovery).toHaveLength(0);
        });

        it('should refuse an unproven session to delete a device', async () => {
            await useSession();

            const pending = repository.seed({
                userId,
                realmId,
                kind: UserAuthenticatorKind.TOTP,
                confirmed: false,
            });

            confirmConcurrently();

            await expectStepUp(service.delete(pending.id, makeActor()));

            expect(await repository.findOneById(pending.id)).not.toBeNull();
        });

        it('should refuse an unproven session to confirm a second factor', async () => {
            await useSession();

            const totp = await service.enroll({ kind: UserAuthenticatorKind.TOTP }, makeActor());

            confirmConcurrently();

            await expectStepUp(service.confirm(totp.data.id, totpCode(totp.meta.secret!), makeActor()));

            expect((await repository.findOneById(totp.data.id))?.confirmed).toBe(false);
        });

        it('should refuse an unproven session to enroll an email factor', async () => {
            await useSession();
            confirmConcurrently();

            await expectStepUp(service.enroll({ kind: UserAuthenticatorKind.EMAIL }, makeActor()));

            const email = (await repository.findAllByUser(userId))
                .filter((entity) => entity.kind === UserAuthenticatorKind.EMAIL);

            expect(email).toHaveLength(0);
        });
    });
});
