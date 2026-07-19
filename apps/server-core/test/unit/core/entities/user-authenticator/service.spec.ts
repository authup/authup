/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import type { Key, User } from '@authup/core-kit';
import { IdentityType, UserAuthenticatorKind } from '@authup/core-kit';
import {
    ErrorCode,
    isAuthupError,
    isEntityCredentialsInvalidError,
    isMfaThrottledError,
} from '@authup/errors';
import { JWKType, JWKUse } from '@authup/specs';
import { MemoryCache, buildCacheKey } from '@authup/server-kit';
import type { ActorContext } from '@authup/server-kit';
import { Secret, TOTP } from 'otpauth';
import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';
import { FakePermissionEvaluator } from '@authup/server-test-kit';
import { MailTemplateRenderer } from '../../../../../src/core/mail/index.ts';
import { RealmCipher } from '../../../../../src/core/key/index.ts';
import { UserAuthenticatorService } from '../../../../../src/core/entities/user-authenticator/service.ts';
import {
    USER_AUTHENTICATOR_ATTEMPT_CACHE_PREFIX,
    USER_AUTHENTICATOR_VERIFY_LOCK_CACHE_PREFIX,
    USER_AUTHENTICATOR_VERIFY_LOCK_RENEW_INTERVAL,
    USER_AUTHENTICATOR_VERIFY_LOCK_TTL,
    USER_AUTHENTICATOR_WEBAUTHN_AUTH_CACHE_PREFIX,
    USER_AUTHENTICATOR_WEBAUTHN_REG_CACHE_PREFIX,
} from '../../../../../src/core/entities/user-authenticator/constants.ts';
import type { UserAuthenticatorServiceOptions } from '../../../../../src/core/entities/user-authenticator/types.ts';
import { FakeKeyStore, FakeMailClient } from '../../helpers/index.ts';
import { FakeUserRepository } from '../user/fake-repository.ts';
import { FakeUserAuthenticatorRepository } from './fake-repository.ts';

const realmId = randomUUID();
const userId = randomUUID();
const otherUserId = randomUUID();

const cipherKey = Buffer.alloc(32, 7).toString('base64');

function buildRealmCipher() {
    const timestamp = new Date().toISOString();
    const key: Key = {
        id: randomUUID(),
        name: 'enc-test',
        type: JWKType.OCT,
        use: JWKUse.ENCRYPTION,
        status: 'active',
        signatureAlgorithm: null,
        priority: 0,
        decryptionKey: cipherKey,
        encryptionKey: null,
        createdAt: timestamp,
        updatedAt: timestamp,
        realmId,
        realm: {
            id: realmId,
            name: 'master',
            displayName: null,
            description: null,
            builtIn: true,
            createdAt: timestamp,
            updatedAt: timestamp,
        },
    };

    return new RealmCipher({ keyStore: new FakeKeyStore(key) });
}

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
                realmId,
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

    const webauthnOptions = {
        rpId: 'localhost',
        rpName: 'authup',
        origin: 'http://localhost:3000',
    };

    function buildService(options: UserAuthenticatorServiceOptions = { enabled: true }) {
        return new UserAuthenticatorService({
            repository,
            userRepository,
            cache,
            cipher: buildRealmCipher(),
            mailClient,
            mailTemplateRenderer: new MailTemplateRenderer(),
            options: { webauthn: webauthnOptions, ...options },
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

            expect(result.meta.secret).toBeDefined();
            expect(result.meta.uri).toContain('otpauth://totp/');
            expect(result.meta.qr).toContain('data:image/png');
            expect(result.data.confirmed).toBeFalsy();
            expect(result.data.secret).toBeNull();
            expect(result.data.userId).toEqual(userId);
            expect(result.data.realmId).toEqual(realmId);

            // at rest the seed is encrypted — never the raw base32
            const [stored] = await repository.findAllWithSecretsByUser(userId);
            expect(stored.secret).toBeDefined();
            expect(stored.secret).not.toEqual(result.meta.secret);
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

        it('rejects enrolling another user without permission', async () => {
            userRepository.seed({
                id: otherUserId, 
                name: 'other', 
                realmId, 
            } as Partial<User>);

            expect.assertions(1);
            try {
                await service.enroll(
                    { kind: UserAuthenticatorKind.TOTP, userId: otherUserId },
                    makeActor({ allow: false }),
                );
            } catch (e) {
                expect(e).toBeDefined();
            }
        });

        // Every kind except email would hand the enroller a factor it controls:
        // totp/recovery return the seed/codes, and a webauthn ceremony can be
        // completed on the enroller's own authenticator. Those are
        // self-enrollment only even for a privileged actor — an admin resets
        // another user's MFA by deleting it.
        it.each([
            UserAuthenticatorKind.TOTP,
            UserAuthenticatorKind.RECOVERY,
            UserAuthenticatorKind.WEBAUTHN,
        ])(
            'refuses a privileged actor enrolling a %s factor for another user',
            async (kind) => {
                userRepository.seed({
                    id: otherUserId,
                    name: 'other',
                    realmId,
                } as Partial<User>);

                expect.assertions(2);
                try {
                    await service.enroll({ kind, userId: otherUserId }, makeActor());
                } catch (e) {
                    expect(isAuthupError(e)).toBeTruthy();
                    expect((e as { code?: string }).code).toEqual(ErrorCode.BAD_REQUEST);
                }
            },
        );

        // Email is the one exception: its code is mailed to the user's own
        // mailbox, so provisioning it for another user discloses no secret to
        // the enroller — a privileged actor may still enable it.
        it('allows a privileged actor to enroll email for another user', async () => {
            userRepository.seed({
                id: otherUserId,
                name: 'other',
                email: 'other@example.com',
                realmId,
            } as Partial<User>);

            const result = await service.enroll(
                { kind: UserAuthenticatorKind.EMAIL, userId: otherUserId },
                makeActor(),
            );

            expect(result.data.userId).toEqual(otherUserId);
            expect(result.data.confirmed).toBeTruthy();
        });
    });

    describe('confirm', () => {
        it('confirms with a valid code and rejects an invalid one', async () => {
            const first = await service.enroll({ kind: UserAuthenticatorKind.TOTP }, makeActor());

            const confirmed = await service.confirm(
                first.data.id,
                totpCode(first.meta.secret!),
                makeActor(),
            );
            expect(confirmed.confirmed).toBeTruthy();
            expect(confirmed.secret).toBeNull();

            const second = await service.enroll({ kind: UserAuthenticatorKind.TOTP }, makeActor());

            expect.assertions(3);
            try {
                await service.confirm(second.data.id, '000000', makeActor());
            } catch (e) {
                expect(isEntityCredentialsInvalidError(e)).toBeTruthy();
            }
        });
    });

    describe('enroll (recovery)', () => {
        it('issues single-use codes, hashed at rest, with regenerate semantics', async () => {
            const first = await service.enroll({ kind: UserAuthenticatorKind.RECOVERY }, makeActor());
            expect(first.meta.codes).toHaveLength(10);
            expect(first.data.confirmed).toBeTruthy();
            expect(first.data.codes).toBeNull();

            const [stored] = await repository.findAllWithSecretsByUser(userId);
            expect(stored.codes).not.toContain(first.meta.codes![0]);

            // regenerate replaces the previous set
            const second = await service.enroll({ kind: UserAuthenticatorKind.RECOVERY }, makeActor());
            const all = await repository.findAllWithSecretsByUser(userId, { kind: UserAuthenticatorKind.RECOVERY });
            expect(all).toHaveLength(1);

            const verified = await service.verify(userId, {
                kind: UserAuthenticatorKind.RECOVERY,
                response: first.meta.codes![0],
            });
            expect(verified).toBeFalsy();

            cache = new MemoryCache();
            service = buildService();
            const verifiedSecond = await service.verify(userId, {
                kind: UserAuthenticatorKind.RECOVERY,
                response: second.meta.codes![0],
            });
            expect(verifiedSecond).toBeTruthy();
        });

        it('accepts a recovery code exactly once', async () => {
            const enrolled = await service.enroll({ kind: UserAuthenticatorKind.RECOVERY }, makeActor());
            const [code] = enrolled.meta.codes!;

            expect(await service.verify(userId, { kind: UserAuthenticatorKind.RECOVERY, response: code })).toBeTruthy();
            expect(await service.verify(userId, { kind: UserAuthenticatorKind.RECOVERY, response: code })).toBeFalsy();
        });
    });

    describe('verify (totp)', () => {
        it('verifies a valid code and stamps lastUsedAt', async () => {
            const enrolled = await service.enroll({ kind: UserAuthenticatorKind.TOTP }, makeActor());
            await service.confirm(enrolled.data.id, totpCode(enrolled.meta.secret!), makeActor());

            const verified = await service.verify(userId, {
                kind: UserAuthenticatorKind.TOTP,
                response: totpCode(enrolled.meta.secret!),
            });
            expect(verified).toBeTruthy();

            const [stored] = await repository.findAllWithSecretsByUser(userId);
            expect(stored.lastUsedAt).toBeDefined();
        });

        it('rejects replay of an already-used login code within its window (#3237)', async () => {
            const enrolled = await service.enroll({ kind: UserAuthenticatorKind.TOTP }, makeActor());
            await service.confirm(enrolled.data.id, totpCode(enrolled.meta.secret!), makeActor());

            const code = totpCode(enrolled.meta.secret!);
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
            await service.confirm(enrolled.data.id, totpCode(enrolled.meta.secret!), makeActor());

            // simulate a concurrent verify holding the per-user lock
            const lockKey = buildCacheKey({ prefix: USER_AUTHENTICATOR_VERIFY_LOCK_CACHE_PREFIX, key: userId });
            expect(await cache.add(lockKey, 1)).toBeTruthy();

            const code = totpCode(enrolled.meta.secret!);
            expect(await service.verify(userId, { kind: UserAuthenticatorKind.TOTP, response: code })).toBeFalsy();

            // the step was NOT consumed — the same code succeeds once the lock frees
            await cache.drop(lockKey);
            expect(await service.verify(userId, { kind: UserAuthenticatorKind.TOTP, response: code })).toBeTruthy();
        });

        it('keeps the verify lock beyond its base TTL while the success hook is in flight', async () => {
            const enrolled = await service.enroll({ kind: UserAuthenticatorKind.RECOVERY }, makeActor());
            const [code] = enrolled.meta.codes!;

            let markStarted! : () => void;
            const started = new Promise<void>((resolve) => { markStarted = resolve; });
            let releaseHook! : () => void;
            const hookGate = new Promise<void>((resolve) => { releaseHook = resolve; });
            const renew = vi.spyOn(cache, 'renewIfValue');

            vi.useFakeTimers();
            try {
                const verification = service.verify(
                    userId,
                    { kind: UserAuthenticatorKind.RECOVERY, response: code },
                    {
                        onVerified: async () => {
                            markStarted();
                            await hookGate;
                        },
                    },
                );

                await started;
                await vi.advanceTimersByTimeAsync(
                    USER_AUTHENTICATOR_VERIFY_LOCK_TTL + USER_AUTHENTICATOR_VERIFY_LOCK_RENEW_INTERVAL,
                );
                expect(renew.mock.calls.length).toBeGreaterThanOrEqual(3);

                await expect(service.verify(userId, {
                    kind: UserAuthenticatorKind.RECOVERY,
                    response: code,
                })).resolves.toBeFalsy();

                releaseHook();
                await expect(verification).resolves.toBeTruthy();
            } finally {
                vi.useRealTimers();
            }
        });

        it('fails verification closed when the cache is unavailable', async () => {
            const enrolled = await service.enroll({ kind: UserAuthenticatorKind.TOTP }, makeActor());
            await service.confirm(enrolled.data.id, totpCode(enrolled.meta.secret!), makeActor());

            cache.get = async () => { throw new Error('cache unavailable'); };

            await expect(service.verify(userId, {
                kind: UserAuthenticatorKind.TOTP,
                response: totpCode(enrolled.meta.secret!),
            })).resolves.toBeFalsy();
        });

        it('fails enrollment confirmation closed (throttled, not a 500) when the cache is unavailable', async () => {
            const enrolled = await service.enroll({ kind: UserAuthenticatorKind.TOTP }, makeActor());

            // the throttle read blips — confirm must degrade to a retry-able 429,
            // never surface the raw cache error as an internal 500.
            cache.get = async () => { throw new Error('cache unavailable'); };

            expect.assertions(1);
            try {
                await service.confirm(enrolled.data.id, totpCode(enrolled.meta.secret!), makeActor());
            } catch (e) {
                expect(isMfaThrottledError(e)).toBeTruthy();
            }
        });

        it('ignores unconfirmed devices', async () => {
            const enrolled = await service.enroll({ kind: UserAuthenticatorKind.TOTP }, makeActor());

            const verified = await service.verify(userId, {
                kind: UserAuthenticatorKind.TOTP,
                response: totpCode(enrolled.meta.secret!),
            });
            expect(verified).toBeFalsy();
        });

        it('fails closed (a plain verification failure) when the seed blob references an unknown key', async () => {
            const enrolled = await service.enroll({ kind: UserAuthenticatorKind.TOTP }, makeActor());
            await service.confirm(enrolled.data.id, totpCode(enrolled.meta.secret!), makeActor());

            // same device rows, but a cipher whose key store no longer
            // resolves the blob's key id — verify must return false, not 500.
            service = new UserAuthenticatorService({
                repository,
                userRepository,
                cache,
                cipher: new RealmCipher({ keyStore: new FakeKeyStore(null) }),
                options: { enabled: true },
            });

            const verified = await service.verify(userId, {
                kind: UserAuthenticatorKind.TOTP,
                response: totpCode(enrolled.meta.secret!),
            });
            expect(verified).toBeFalsy();
        });

        it('lets infrastructure errors during seed decryption bubble (attempt not burned)', async () => {
            const enrolled = await service.enroll({ kind: UserAuthenticatorKind.TOTP }, makeActor());
            await service.confirm(enrolled.data.id, totpCode(enrolled.meta.secret!), makeActor());

            // a cipher failing with a NON-blob-semantics error (database
            // outage, KEK misconfiguration) must surface as a thrown error —
            // mapping it to `false` would burn a throttle attempt on a blip.
            service = new UserAuthenticatorService({
                repository,
                userRepository,
                cache,
                cipher: {
                    encrypt: async () => {
                        throw new Error('unused');
                    },
                    decrypt: async () => {
                        throw new Error('database gone');
                    },
                },
                options: { enabled: true },
            });

            await expect(service.verify(userId, {
                kind: UserAuthenticatorKind.TOTP,
                response: totpCode(enrolled.meta.secret!),
            })).rejects.toThrow('database gone');

            const attempts = await cache.get(buildCacheKey({
                prefix: USER_AUTHENTICATOR_ATTEMPT_CACHE_PREFIX,
                key: userId,
            }));
            expect(attempts ?? null).toBeNull();
        });
    });

    describe('per-account backoff', () => {
        it('locks after a failed attempt and releases after the window', async () => {
            const enrolled = await service.enroll({ kind: UserAuthenticatorKind.TOTP }, makeActor());
            await service.confirm(enrolled.data.id, totpCode(enrolled.meta.secret!), makeActor());

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
                response: totpCode(enrolled.meta.secret!),
            });
            expect(verified).toBeTruthy();
        });

        it('counts concurrent failures atomically (#3237)', async () => {
            const enrolled = await service.enroll({ kind: UserAuthenticatorKind.TOTP }, makeActor());
            await service.confirm(enrolled.data.id, totpCode(enrolled.meta.secret!), makeActor());

            expect(await service.verify(userId, { kind: UserAuthenticatorKind.TOTP, response: '000000' })).toBeFalsy();

            const count = await cache.get(
                buildCacheKey({ prefix: USER_AUTHENTICATOR_ATTEMPT_CACHE_PREFIX, key: userId }),
            );
            expect(count).toBe(1);
        });

        it('recovers from a legacy (non-numeric) attempt-counter value', async () => {
            const enrolled = await service.enroll({ kind: UserAuthenticatorKind.TOTP }, makeActor());
            await service.confirm(enrolled.data.id, totpCode(enrolled.meta.secret!), makeActor());

            // a pre-upgrade deployment stored the state as a JSON object
            const key = buildCacheKey({ prefix: USER_AUTHENTICATOR_ATTEMPT_CACHE_PREFIX, key: userId });
            await cache.set(key, { count: 3, lockedUntil: 0 }, {});

            expect(await service.verify(userId, { kind: UserAuthenticatorKind.TOTP, response: '000000' })).toBeFalsy();

            // the legacy value was dropped and the count restarted
            expect(await cache.get(key)).toBe(1);
        });
    });

    describe('verify unit of work (#3237)', () => {
        it('does not consume a recovery code when the onVerified hook fails', async () => {
            const enrolled = await service.enroll({ kind: UserAuthenticatorKind.RECOVERY }, makeActor());
            const [code] = enrolled.meta.codes!;

            await expect(service.verify(
                userId,
                { kind: UserAuthenticatorKind.RECOVERY, response: code },
                { onVerified: async () => { throw new Error('session stamp failed'); } },
            )).rejects.toThrow('session stamp failed');

            // nothing was consumed (and no penalty applied) — the same code
            // completes the challenge once the stamp works again.
            expect(await service.verify(userId, { kind: UserAuthenticatorKind.RECOVERY, response: code })).toBeTruthy();
        });

        it('does not consume the TOTP step when the onVerified hook fails', async () => {
            const enrolled = await service.enroll({ kind: UserAuthenticatorKind.TOTP }, makeActor());
            await service.confirm(enrolled.data.id, totpCode(enrolled.meta.secret!), makeActor());

            const code = totpCode(enrolled.meta.secret!);
            await expect(service.verify(
                userId,
                { kind: UserAuthenticatorKind.TOTP, response: code },
                { onVerified: async () => { throw new Error('session stamp failed'); } },
            )).rejects.toThrow('session stamp failed');

            expect(await service.verify(userId, { kind: UserAuthenticatorKind.TOTP, response: code })).toBeTruthy();
        });

        it('does not burn an email code when the onVerified hook fails', async () => {
            userRepository.seed({
                id: userId,
                name: 'test-user',
                email: 'user@example.com',
                realmId,
            } as Partial<User>);
            await service.enroll({ kind: UserAuthenticatorKind.EMAIL }, makeActor());
            await service.sendChallenge(userId, UserAuthenticatorKind.EMAIL);
            const code = /(\d{6})/.exec(mailClient.sent[0].text ?? '')![1];

            await expect(service.verify(
                userId,
                { kind: UserAuthenticatorKind.EMAIL, response: code },
                { onVerified: async () => { throw new Error('session stamp failed'); } },
            )).rejects.toThrow('session stamp failed');

            expect(await service.verify(userId, { kind: UserAuthenticatorKind.EMAIL, response: code })).toBeTruthy();

            // still single-use once actually consumed
            expect(await service.verify(userId, { kind: UserAuthenticatorKind.EMAIL, response: code })).toBeFalsy();
        });

        it('runs the onVerified hook on success only, never on a failed code', async () => {
            const enrolled = await service.enroll({ kind: UserAuthenticatorKind.RECOVERY }, makeActor());
            const [code] = enrolled.meta.codes!;

            let calls = 0;
            const onVerified = async () => { calls += 1; };

            expect(await service.verify(
                userId,
                { kind: UserAuthenticatorKind.RECOVERY, response: 'not-a-code' },
                { onVerified },
            )).toBeFalsy();
            expect(calls).toBe(0);

            // wait out the 1s lock from the failed attempt
            await new Promise((resolve) => { setTimeout(resolve, 1_100); });

            expect(await service.verify(
                userId,
                { kind: UserAuthenticatorKind.RECOVERY, response: code },
                { onVerified },
            )).toBeTruthy();
            expect(calls).toBe(1);
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

            await service.confirm(enrolled.data.id, totpCode(enrolled.meta.secret!), makeActor());
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
                realmId,
            } as Partial<User>);
        }

        it('enrolls a confirmed email device (email present)', async () => {
            seedUserWithEmail();

            const result = await service.enroll({ kind: UserAuthenticatorKind.EMAIL }, makeActor());
            expect(result.data.kind).toEqual(UserAuthenticatorKind.EMAIL);
            expect(result.data.confirmed).toBeTruthy();

            const status = await service.challenge(userId);
            expect(status.required).toBeTruthy();
            expect(status.kinds).toContain(UserAuthenticatorKind.EMAIL);
        });

        it('rejects email enrollment when the user has no email', async () => {
            userRepository.seed({
                id: userId, 
                name: 'no-email', 
                realmId,
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
                cipher: buildRealmCipher(),
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
            expect(second.data.id).toEqual(first.data.id);
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

    describe('webauthn', () => {
        it('enrolls with registration options and stores a challenge (unconfirmed)', async () => {
            const result = await service.enroll({ kind: UserAuthenticatorKind.WEBAUTHN }, makeActor());

            expect(result.data.kind).toEqual(UserAuthenticatorKind.WEBAUTHN);
            expect(result.data.confirmed).toBeFalsy();
            expect(result.meta.webauthn).toBeDefined();
            expect((result.meta.webauthn as any).challenge).toBeDefined();
            expect((result.meta.webauthn as any).rp.id).toEqual('localhost');

            // a challenge nonce was cached for the confirm ceremony, keyed by
            // the new row id (not the user id) so ceremonies don't collide
            const cached = await cache.get(buildCacheKey({
                prefix: USER_AUTHENTICATOR_WEBAUTHN_REG_CACHE_PREFIX,
                key: result.data.id,
            }));
            expect(cached).not.toBeNull();

            // an unconfirmed webauthn device does not satisfy a challenge
            expect(await service.hasConfirmed(userId)).toBeFalsy();
        });

        it('keys the registration challenge per-enrollment (concurrent ceremonies do not collide)', async () => {
            const first = await service.enroll({ kind: UserAuthenticatorKind.WEBAUTHN }, makeActor());
            const second = await service.enroll({ kind: UserAuthenticatorKind.WEBAUTHN }, makeActor());

            const regKey = (id: string) => buildCacheKey({
                prefix: USER_AUTHENTICATOR_WEBAUTHN_REG_CACHE_PREFIX,
                key: id,
            });

            // each ceremony cached its own challenge under its row id — the
            // second enroll did not overwrite the first's challenge
            expect(first.data.id).not.toEqual(second.data.id);
            expect(await cache.get(regKey(first.data.id))).not.toBeNull();
            expect(await cache.get(regKey(second.data.id))).not.toBeNull();
        });

        it('throttles repeated failed webauthn confirms (brute-force backoff)', async () => {
            const enrolled = await service.enroll({ kind: UserAuthenticatorKind.WEBAUTHN }, makeActor());

            // force the cached challenge to be expired so the confirm fails and
            // bumps the attempt counter (the throttle the TOTP branch applies too)
            await cache.set(
                buildCacheKey({
                    prefix: USER_AUTHENTICATOR_WEBAUTHN_REG_CACHE_PREFIX,
                    key: enrolled.data.id,
                }),
                { challenge: 'x', expiresAt: Date.now() - 1_000 },
                { ttl: 10_000 },
            );

            expect.assertions(2);
            let firstFailed = false;
            try {
                await service.confirm(enrolled.data.id, '{}', makeActor());
            } catch {
                firstFailed = true;
            }
            expect(firstFailed).toBeTruthy();

            // the next attempt is locked out (factor 1 → 1s after the first failure)
            try {
                await service.confirm(enrolled.data.id, '{}', makeActor());
            } catch (e) {
                expect(isMfaThrottledError(e)).toBeTruthy();
            }
        });

        it('surfaces authentication options in the challenge for a confirmed device', async () => {
            // seed a confirmed webauthn device with credential parameters
            repository.seed({
                kind: UserAuthenticatorKind.WEBAUTHN,
                userId,
                realmId,
                confirmed: true,
                parameters: JSON.stringify({
                    rp_id: 'localhost',
                    credential_id: 'Y3JlZC1pZA',
                    public_key: 'cHVia2V5',
                    counter: 0,
                    transports: ['internal'],
                }),
            });
            service = buildService();

            const status = await service.challenge(userId);
            expect(status.required).toBeTruthy();
            expect(status.kinds).toContain(UserAuthenticatorKind.WEBAUTHN);
            expect(status.challenge).toBeDefined();
            expect((status.challenge as any).webauthn.challenge).toBeDefined();
            // the allowed credential is scoped to the enrolled device
            expect((status.challenge as any).webauthn.allowCredentials[0].id).toEqual('Y3JlZC1pZA');

            const cached = await cache.get(buildCacheKey({
                prefix: USER_AUTHENTICATOR_WEBAUTHN_AUTH_CACHE_PREFIX,
                key: userId,
            }));
            expect(cached).not.toBeNull();
        });

        it('fails closed without a configured relying-party origin', async () => {
            service = new UserAuthenticatorService({
                repository,
                userRepository,
                cache,
                cipher: buildRealmCipher(),
                options: { enabled: true },
            });

            expect.assertions(1);
            try {
                await service.enroll({ kind: UserAuthenticatorKind.WEBAUTHN }, makeActor());
            } catch (e) {
                expect((e as any).code).toEqual(ErrorCode.MFA_NOT_CONFIGURABLE);
            }
        });

        it('rejects a malformed attestation on confirm', async () => {
            const enrolled = await service.enroll({ kind: UserAuthenticatorKind.WEBAUTHN }, makeActor());

            expect.assertions(1);
            try {
                await service.confirm(enrolled.data.id, 'not-json', makeActor());
            } catch (e) {
                expect(e).toBeDefined();
            }
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

            const one = await service.getOne(enrolled.data.id, actor, { userId });
            expect(one.secret).toBeNull();

            const deleted = await service.delete(enrolled.data.id, actor, { userId });
            expect(deleted.id).toEqual(enrolled.data.id);
            expect(await repository.findAllByUser(userId)).toHaveLength(0);
        });

        it('denies foreign device access without permission', async () => {
            const entity = repository.seed({
                kind: UserAuthenticatorKind.TOTP,
                userId: otherUserId,
                realmId,
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
                userId: otherUserId,
                realmId,
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
