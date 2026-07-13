/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import type { User } from '@authup/core-kit';
import { IdentityType, UserAuthenticatorKind } from '@authup/core-kit';
import {
    ErrorCode,
    isAuthupError,
    isEntityCredentialsInvalidError,
    isMfaThrottledError,
} from '@authup/errors';
import { MemoryCache, SymmetricCipher, buildCacheKey } from '@authup/server-kit';
import type { ActorContext } from '@authup/server-kit';
import { Secret, TOTP } from 'otpauth';
import {
    beforeEach,
    describe,
    expect,
    it,
} from 'vitest';
import { FakePermissionEvaluator } from '@authup/server-test-kit';
import { MailTemplateRenderer } from '../../../../../src/core/mail/index.ts';
import { UserAuthenticatorService } from '../../../../../src/core/entities/user-authenticator/service.ts';
import { USER_AUTHENTICATOR_VERIFY_LOCK_CACHE_PREFIX } from '../../../../../src/core/entities/user-authenticator/constants.ts';
import type { UserAuthenticatorServiceOptions } from '../../../../../src/core/entities/user-authenticator/types.ts';
import { FakeMailClient } from '../../helpers/index.ts';
import { FakeUserRepository } from '../user/fake-repository.ts';
import { FakeUserAuthenticatorRepository } from './fake-repository.ts';

const realmId = randomUUID();
const userId = randomUUID();
const otherUserId = randomUUID();

const cipherKey = Buffer.alloc(32, 7).toString('base64');

function makeActor(options: {
    allow?: boolean, 
    identity?: boolean, 
    id?: string 
} = {}): ActorContext {
    const evaluator = new FakePermissionEvaluator();
    if (options.allow === false) {
        evaluator.denyAll();
    }

    const actor: ActorContext = { permissionEvaluator: evaluator };
    if (options.identity !== false) {
        actor.identity = {
            type: IdentityType.USER,
            data: {
                id: options.id ?? userId,
                name: 'test-user',
                realm_id: realmId,
            } as User,
        };
    }

    return actor;
}

function totpCode(base32: string): string {
    return new TOTP({
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: Secret.fromBase32(base32),
    }).generate();
}

describe('UserAuthenticatorService', () => {
    let repository: FakeUserAuthenticatorRepository;
    let userRepository: FakeUserRepository;
    let cache: MemoryCache;
    let mailClient: FakeMailClient;
    let service: UserAuthenticatorService;

    function buildService(options: UserAuthenticatorServiceOptions = { enabled: true }) {
        return new UserAuthenticatorService({
            repository,
            userRepository,
            cache,
            cipher: new SymmetricCipher(cipherKey),
            mailClient,
            mailTemplateRenderer: new MailTemplateRenderer(),
            options,
        });
    }

    beforeEach(() => {
        repository = new FakeUserAuthenticatorRepository();
        userRepository = new FakeUserRepository();
        cache = new MemoryCache();
        mailClient = new FakeMailClient();
        service = buildService();
    });

    describe('enroll (totp)', () => {
        it('enrolls an unconfirmed totp device with encrypted seed', async () => {
            const result = await service.enroll({ kind: UserAuthenticatorKind.TOTP }, makeActor());

            expect(result.secret).toBeDefined();
            expect(result.uri).toContain('otpauth://totp/');
            expect(result.qr).toContain('data:image/png');
            expect(result.entity.confirmed).toBeFalsy();
            expect(result.entity.secret).toBeNull();
            expect(result.entity.user_id).toEqual(userId);
            expect(result.entity.realm_id).toEqual(realmId);

            // at rest the seed is encrypted — never the raw base32
            const [stored] = await repository.findAllWithSecretsByUser(userId);
            expect(stored.secret).toBeDefined();
            expect(stored.secret).not.toEqual(result.secret);
        });

        it('fails closed when the feature is disabled', async () => {
            service = buildService({ enabled: false });

            expect.assertions(2);
            try {
                await service.enroll({ kind: UserAuthenticatorKind.TOTP }, makeActor());
            } catch (e) {
                expect(isAuthupError(e)).toBeTruthy();
                expect((e as any).code).toEqual(ErrorCode.MFA_NOT_CONFIGURABLE);
            }
        });

        it('fails closed without an encryption key', async () => {
            service = new UserAuthenticatorService({
                repository,
                userRepository,
                cache,
                cipher: null,
                options: { enabled: true },
            });

            expect.assertions(1);
            try {
                await service.enroll({ kind: UserAuthenticatorKind.TOTP }, makeActor());
            } catch (e) {
                expect((e as any).code).toEqual(ErrorCode.MFA_NOT_CONFIGURABLE);
            }
        });

        it('rejects enrolling another user without permission', async () => {
            userRepository.seed({
                id: otherUserId, 
                name: 'other', 
                realm_id: realmId, 
            } as Partial<User>);

            expect.assertions(1);
            try {
                await service.enroll(
                    { kind: UserAuthenticatorKind.TOTP, user_id: otherUserId },
                    makeActor({ allow: false }),
                );
            } catch (e) {
                expect(e).toBeDefined();
            }
        });

        it('allows a privileged actor to enroll another user', async () => {
            userRepository.seed({
                id: otherUserId, 
                name: 'other', 
                realm_id: realmId, 
            } as Partial<User>);

            const result = await service.enroll(
                { kind: UserAuthenticatorKind.TOTP, user_id: otherUserId },
                makeActor(),
            );

            expect(result.entity.user_id).toEqual(otherUserId);
        });
    });

    describe('confirm', () => {
        it('confirms with a valid code and rejects an invalid one', async () => {
            const first = await service.enroll({ kind: UserAuthenticatorKind.TOTP }, makeActor());

            const confirmed = await service.confirm(
                first.entity.id,
                totpCode(first.secret!),
                makeActor(),
            );
            expect(confirmed.confirmed).toBeTruthy();
            expect(confirmed.secret).toBeNull();

            const second = await service.enroll({ kind: UserAuthenticatorKind.TOTP }, makeActor());

            expect.assertions(3);
            try {
                await service.confirm(second.entity.id, '000000', makeActor());
            } catch (e) {
                expect(isEntityCredentialsInvalidError(e)).toBeTruthy();
            }
        });
    });

    describe('enroll (recovery)', () => {
        it('issues single-use codes, hashed at rest, with regenerate semantics', async () => {
            const first = await service.enroll({ kind: UserAuthenticatorKind.RECOVERY }, makeActor());
            expect(first.codes).toHaveLength(10);
            expect(first.entity.confirmed).toBeTruthy();
            expect(first.entity.codes).toBeNull();

            const [stored] = await repository.findAllWithSecretsByUser(userId);
            expect(stored.codes).not.toContain(first.codes![0]);

            // regenerate replaces the previous set
            const second = await service.enroll({ kind: UserAuthenticatorKind.RECOVERY }, makeActor());
            const all = await repository.findAllWithSecretsByUser(userId, { kind: UserAuthenticatorKind.RECOVERY });
            expect(all).toHaveLength(1);

            const verified = await service.verify(userId, {
                kind: UserAuthenticatorKind.RECOVERY,
                response: first.codes![0],
            });
            expect(verified).toBeFalsy();

            cache = new MemoryCache();
            service = buildService();
            const verifiedSecond = await service.verify(userId, {
                kind: UserAuthenticatorKind.RECOVERY,
                response: second.codes![0],
            });
            expect(verifiedSecond).toBeTruthy();
        });

        it('accepts a recovery code exactly once', async () => {
            const enrolled = await service.enroll({ kind: UserAuthenticatorKind.RECOVERY }, makeActor());
            const [code] = enrolled.codes!;

            expect(await service.verify(userId, { kind: UserAuthenticatorKind.RECOVERY, response: code })).toBeTruthy();
            expect(await service.verify(userId, { kind: UserAuthenticatorKind.RECOVERY, response: code })).toBeFalsy();
        });
    });

    describe('verify (totp)', () => {
        it('verifies a valid code and stamps last_used_at', async () => {
            const enrolled = await service.enroll({ kind: UserAuthenticatorKind.TOTP }, makeActor());
            await service.confirm(enrolled.entity.id, totpCode(enrolled.secret!), makeActor());

            const verified = await service.verify(userId, {
                kind: UserAuthenticatorKind.TOTP,
                response: totpCode(enrolled.secret!),
            });
            expect(verified).toBeTruthy();

            const [stored] = await repository.findAllWithSecretsByUser(userId);
            expect(stored.last_used_at).toBeDefined();
        });

        it('rejects replay of an already-used login code within its window (#3237)', async () => {
            const enrolled = await service.enroll({ kind: UserAuthenticatorKind.TOTP }, makeActor());
            await service.confirm(enrolled.entity.id, totpCode(enrolled.secret!), makeActor());

            const code = totpCode(enrolled.secret!);
            // the first LOGIN with this code is accepted (the confirmation does
            // not consume the step); a replay of the same code is rejected —
            // the consumed step is persisted and must strictly advance.
            expect(await service.verify(userId, { kind: UserAuthenticatorKind.TOTP, response: code })).toBeTruthy();
            expect(await service.verify(userId, { kind: UserAuthenticatorKind.TOTP, response: code })).toBeFalsy();

            const [stored] = await repository.findAllWithSecretsByUser(userId);
            expect(JSON.parse(stored.parameters!).counter).toBeGreaterThan(0);
        });

        it('bails without consuming the factor when the verify lock is held', async () => {
            const enrolled = await service.enroll({ kind: UserAuthenticatorKind.TOTP }, makeActor());
            await service.confirm(enrolled.entity.id, totpCode(enrolled.secret!), makeActor());

            // simulate a concurrent verify holding the per-user lock
            const lockKey = buildCacheKey({ prefix: USER_AUTHENTICATOR_VERIFY_LOCK_CACHE_PREFIX, key: userId });
            expect(await cache.add(lockKey, 1)).toBeTruthy();

            const code = totpCode(enrolled.secret!);
            expect(await service.verify(userId, { kind: UserAuthenticatorKind.TOTP, response: code })).toBeFalsy();

            // the step was NOT consumed — the same code succeeds once the lock frees
            await cache.drop(lockKey);
            expect(await service.verify(userId, { kind: UserAuthenticatorKind.TOTP, response: code })).toBeTruthy();
        });

        it('ignores unconfirmed devices', async () => {
            const enrolled = await service.enroll({ kind: UserAuthenticatorKind.TOTP }, makeActor());

            const verified = await service.verify(userId, {
                kind: UserAuthenticatorKind.TOTP,
                response: totpCode(enrolled.secret!),
            });
            expect(verified).toBeFalsy();
        });
    });

    describe('per-account backoff', () => {
        it('locks after a failed attempt and releases after the window', async () => {
            const enrolled = await service.enroll({ kind: UserAuthenticatorKind.TOTP }, makeActor());
            await service.confirm(enrolled.entity.id, totpCode(enrolled.secret!), makeActor());

            const failed = await service.verify(userId, { kind: UserAuthenticatorKind.TOTP, response: '000000' });
            expect(failed).toBeFalsy();

            // immediately locked (factor 1 → 1s after the first failure)
            expect.assertions(3);
            try {
                await service.verify(userId, { kind: UserAuthenticatorKind.TOTP, response: '000000' });
            } catch (e) {
                expect(isMfaThrottledError(e)).toBeTruthy();
            }

            await new Promise((resolve) => { setTimeout(resolve, 1_100); });

            const verified = await service.verify(userId, {
                kind: UserAuthenticatorKind.TOTP,
                response: totpCode(enrolled.secret!),
            });
            expect(verified).toBeTruthy();
        });
    });

    describe('challenge', () => {
        it('reports nothing when the feature is disabled', async () => {
            service = buildService({ enabled: false });
            const status = await service.challenge(userId);
            expect(status).toEqual({
                required: false, 
                enrollmentRequired: false, 
                kinds: [], 
            });
        });

        it('requires a factor once a confirmed device exists', async () => {
            const enrolled = await service.enroll({ kind: UserAuthenticatorKind.TOTP }, makeActor());
            let status = await service.challenge(userId);
            expect(status.required).toBeFalsy();

            await service.confirm(enrolled.entity.id, totpCode(enrolled.secret!), makeActor());
            status = await service.challenge(userId);
            expect(status.required).toBeTruthy();
            expect(status.kinds).toEqual([UserAuthenticatorKind.TOTP]);
        });

        it('requires enrollment when mfaRequired is on and no device exists', async () => {
            service = buildService({ enabled: true, required: true });
            const status = await service.challenge(userId);
            expect(status.required).toBeFalsy();
            expect(status.enrollmentRequired).toBeTruthy();
        });
    });

    describe('email otp', () => {
        function seedUserWithEmail() {
            userRepository.seed({
                id: userId,
                name: 'test-user',
                email: 'user@example.com',
                realm_id: realmId,
            } as Partial<User>);
        }

        it('enrolls a confirmed email device (email present)', async () => {
            seedUserWithEmail();

            const result = await service.enroll({ kind: UserAuthenticatorKind.EMAIL }, makeActor());
            expect(result.entity.kind).toEqual(UserAuthenticatorKind.EMAIL);
            expect(result.entity.confirmed).toBeTruthy();

            const status = await service.challenge(userId);
            expect(status.required).toBeTruthy();
            expect(status.kinds).toContain(UserAuthenticatorKind.EMAIL);
        });

        it('rejects email enrollment when the user has no email', async () => {
            userRepository.seed({
                id: userId, 
                name: 'no-email', 
                realm_id: realmId,
            } as Partial<User>);

            expect.assertions(1);
            try {
                await service.enroll({ kind: UserAuthenticatorKind.EMAIL }, makeActor());
            } catch (e) {
                expect(e).toBeDefined();
            }
        });

        it('mails a code and verifies it single-use', async () => {
            seedUserWithEmail();
            await service.enroll({ kind: UserAuthenticatorKind.EMAIL }, makeActor());

            await service.sendChallenge(userId, UserAuthenticatorKind.EMAIL);
            expect(mailClient.sent).toHaveLength(1);
            expect(mailClient.sent[0].to).toEqual('user@example.com');

            const code = /(\d{6})/.exec(mailClient.sent[0].text ?? '')![1];

            expect(await service.verify(userId, {
                kind: UserAuthenticatorKind.EMAIL,
                response: code,
            })).toBeTruthy();

            // single-use — a second verify of the consumed code fails (the
            // success reset the backoff, so this is not a throttle path)
            expect(await service.verify(userId, {
                kind: UserAuthenticatorKind.EMAIL,
                response: code,
            })).toBeFalsy();
        });

        it('fails a verify when no code was sent', async () => {
            seedUserWithEmail();
            await service.enroll({ kind: UserAuthenticatorKind.EMAIL }, makeActor());

            expect(await service.verify(userId, {
                kind: UserAuthenticatorKind.EMAIL,
                response: '000000',
            })).toBeFalsy();
        });

        it('does not mail a code for a user without a confirmed email factor', async () => {
            seedUserWithEmail();
            // no enrollment
            await service.sendChallenge(userId, UserAuthenticatorKind.EMAIL);
            expect(mailClient.sent).toHaveLength(0);
        });

        it('fails closed for email enrollment without a mail transport', async () => {
            seedUserWithEmail();
            service = new UserAuthenticatorService({
                repository,
                userRepository,
                cache,
                cipher: new SymmetricCipher(cipherKey),
                options: { enabled: true },
            });

            expect.assertions(1);
            try {
                await service.enroll({ kind: UserAuthenticatorKind.EMAIL }, makeActor());
            } catch (e) {
                expect((e as any).code).toEqual(ErrorCode.MFA_NOT_CONFIGURABLE);
            }
        });

        it('re-enrolling email updates the existing factor in place (no destructive gap)', async () => {
            seedUserWithEmail();
            const first = await service.enroll({ kind: UserAuthenticatorKind.EMAIL }, makeActor());
            const second = await service.enroll({ kind: UserAuthenticatorKind.EMAIL }, makeActor());

            const rows = (await repository.findAllByUser(userId))
                .filter((device) => device.kind === UserAuthenticatorKind.EMAIL);
            expect(rows).toHaveLength(1);
            // updated in place — same row id, not remove-then-create
            expect(second.entity.id).toEqual(first.entity.id);
            expect(rows[0].confirmed).toBeTruthy();
        });

        it('rate-limits challenge-code emails per user (send cooldown)', async () => {
            seedUserWithEmail();
            await service.enroll({ kind: UserAuthenticatorKind.EMAIL }, makeActor());

            await service.sendChallenge(userId, UserAuthenticatorKind.EMAIL);
            expect(mailClient.sent).toHaveLength(1);

            // a resend within the cooldown is throttled — no second mail
            expect.assertions(3);
            try {
                await service.sendChallenge(userId, UserAuthenticatorKind.EMAIL);
            } catch (e) {
                expect(isMfaThrottledError(e)).toBeTruthy();
            }
            expect(mailClient.sent).toHaveLength(1);
        });

        it('fails email verify closed when the verify lock is unavailable (no persisted backstop)', async () => {
            seedUserWithEmail();
            await service.enroll({ kind: UserAuthenticatorKind.EMAIL }, makeActor());
            await service.sendChallenge(userId, UserAuthenticatorKind.EMAIL);
            const code = /(\d{6})/.exec(mailClient.sent[0].text ?? '')![1];

            // simulate the lock primitive (set-if-absent) erroring while reads work
            const originalAdd = cache.add.bind(cache);
            cache.add = async () => { throw new Error('cache down'); };

            // EMAIL has no persisted anti-replay backstop, so without a real lock
            // it must fail closed rather than risk a concurrent double-consume.
            expect(await service.verify(userId, {
                kind: UserAuthenticatorKind.EMAIL,
                response: code,
            })).toBeFalsy();

            // the code was NOT consumed — it verifies once the lock is back
            cache.add = originalAdd;
            expect(await service.verify(userId, {
                kind: UserAuthenticatorKind.EMAIL,
                response: code,
            })).toBeTruthy();
        });
    });

    describe('getMany / getOne / delete', () => {
        it('lets a user manage own devices without permissions', async () => {
            const enrolled = await service.enroll({ kind: UserAuthenticatorKind.TOTP }, makeActor());

            const actor = makeActor({ allow: false });
            const { data } = await service.getMany({}, actor, { userId });
            expect(data).toHaveLength(1);
            expect(data[0].secret).toBeNull();
            expect(data[0].codes).toBeNull();

            const one = await service.getOne(enrolled.entity.id, actor, { userId });
            expect(one.secret).toBeNull();

            const deleted = await service.delete(enrolled.entity.id, actor, { userId });
            expect(deleted.id).toEqual(enrolled.entity.id);
            expect(await repository.findAllByUser(userId)).toHaveLength(0);
        });

        it('denies foreign device access without permission', async () => {
            const entity = repository.seed({
                kind: UserAuthenticatorKind.TOTP,
                user_id: otherUserId,
                realm_id: realmId,
                confirmed: true,
            });

            const actor = makeActor({ allow: false });

            expect.assertions(2);
            try {
                await service.getOne(entity.id, actor, { userId: otherUserId });
            } catch (e) {
                expect(e).toBeDefined();
            }
            try {
                await service.delete(entity.id, actor, { userId: otherUserId });
            } catch (e) {
                expect(e).toBeDefined();
            }
        });

        it('scopes a device to its owner on the nested route (404 across users)', async () => {
            const entity = repository.seed({
                kind: UserAuthenticatorKind.TOTP,
                user_id: otherUserId,
                realm_id: realmId,
            });

            expect.assertions(1);
            try {
                await service.getOne(entity.id, makeActor(), { userId });
            } catch (e) {
                expect((e as any).code).toEqual(ErrorCode.ENTITY_NOT_FOUND);
            }
        });
    });
});
