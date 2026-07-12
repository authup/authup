/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuiltInPolicyType, definePolicyData } from '@authup/access';
import { ValidatorGroup } from '@authup/kit';
import {
    EventName, 
    EventRefType, 
    EventScope, 
    IdentityType, 
    PermissionName, 
    UserAuthenticatorKind, 
    UserAuthenticatorValidator,
} from '@authup/core-kit';
import type { User, UserAuthenticator } from '@authup/core-kit';
import {
    AuthupError,
    BadRequestError,
    EntityCredentialsInvalidError,
    EntityNotFoundError,
    ErrorCode,
    MfaThrottledError,
    UnauthorizedError,
    isEntityConflictError,
} from '@authup/errors';
import { 
    AbstractEntityService, 
    buildCacheKey, 
    compare, 
    hash, 
} from '@authup/server-kit';
import type {
    ActorContext,
    EntityRepositoryFindManyResult,
    ICache,
    ISymmetricCipher,
} from '@authup/server-kit';
import { Secret, TOTP } from 'otpauth';
import QRCode from 'qrcode';
import type { IEventService } from '../event/index.ts';
import type { IUserRepository } from '../user/index.ts';
import {
    USER_AUTHENTICATOR_ATTEMPT_CACHE_PREFIX,
    USER_AUTHENTICATOR_ATTEMPT_LOCK_FACTOR,
    USER_AUTHENTICATOR_ATTEMPT_LOCK_MAX,
    USER_AUTHENTICATOR_ATTEMPT_WINDOW,
    USER_AUTHENTICATOR_RECOVERY_CODE_COUNT,
    USER_AUTHENTICATOR_TOTP_ALGORITHM,
    USER_AUTHENTICATOR_TOTP_DIGITS,
    USER_AUTHENTICATOR_TOTP_PERIOD,
} from './constants.ts';
import { generateRecoveryCode } from './helpers.ts';
import type {
    IUserAuthenticatorRepository,
    IUserAuthenticatorService,
    UserAuthenticatorChallengeStatus,
    UserAuthenticatorEnrollResult,
    UserAuthenticatorRecoveryCode,
    UserAuthenticatorServiceContext,
    UserAuthenticatorServiceOptions,
    UserAuthenticatorTotpParameters,
    UserAuthenticatorVerifyContext,
    UserAuthenticatorVerifyInput,
} from './types.ts';

type AttemptState = {
    count: number,
    lockedUntil: number,
};

export class UserAuthenticatorService extends AbstractEntityService implements IUserAuthenticatorService {
    protected repository: IUserAuthenticatorRepository;

    protected userRepository: IUserRepository;

    protected cache: ICache;

    protected cipher: ISymmetricCipher | null;

    protected eventService?: IEventService;

    protected options: UserAuthenticatorServiceOptions;

    protected validator: UserAuthenticatorValidator;

    constructor(ctx: UserAuthenticatorServiceContext) {
        super();

        this.repository = ctx.repository;
        this.userRepository = ctx.userRepository;
        this.cache = ctx.cache;
        this.cipher = ctx.cipher ?? null;
        this.eventService = ctx.eventService;
        this.options = ctx.options ?? {};
        this.validator = new UserAuthenticatorValidator();
    }

    protected isOwnedBy(entity: UserAuthenticator, actor: ActorContext): boolean {
        return !!actor.identity &&
            actor.identity.type === IdentityType.USER &&
            entity.user_id === actor.identity.data.id;
    }

    /**
     * The secret/codes columns never leave the service — reads return the
     * row with both nulled (defense in depth on top of select:false).
     */
    protected sanitize(entity: UserAuthenticator): UserAuthenticator {
        return {
            ...entity,
            secret: null,
            codes: null,
        };
    }

    // ------------------------------------------------------------------

    async getMany(
        query: Record<string, any>,
        actor: ActorContext,
        options: { userId?: string } = {},
    ): Promise<EntityRepositoryFindManyResult<UserAuthenticator>> {
        const isSelf = !!options.userId &&
            !!actor.identity &&
            actor.identity.type === IdentityType.USER &&
            actor.identity.data.id === options.userId;

        if (!isSelf) {
            await actor.permissionEvaluator.preEvaluate({ name: PermissionName.USER_AUTHENTICATOR_READ });
        }

        const { data: entities, meta } = await this.repository.findMany(
            query,
            options.userId ? { owner: { userId: options.userId } } : {},
        );

        const data: UserAuthenticator[] = [];
        let { total } = meta;

        for (const entity of entities) {
            if (this.isOwnedBy(entity, actor)) {
                data.push(this.sanitize(entity));
                continue;
            }

            try {
                await actor.permissionEvaluator.evaluate({
                    name: PermissionName.USER_AUTHENTICATOR_READ,
                    data: definePolicyData({
                        [BuiltInPolicyType.ATTRIBUTES]: entity,
                        ...this.resourceRealmMatch(entity),
                    }),
                });
                data.push(this.sanitize(entity));
            } catch {
                total -= 1;
            }
        }

        return {
            data,
            meta: {
                ...meta,
                total,
            },
        };
    }

    async getOne(
        id: string,
        actor: ActorContext,
        options: { userId?: string } = {},
    ): Promise<UserAuthenticator> {
        const entity = await this.resolveOne(id, options.userId);

        if (!this.isOwnedBy(entity, actor)) {
            await actor.permissionEvaluator.preEvaluate({ name: PermissionName.USER_AUTHENTICATOR_READ });
            await actor.permissionEvaluator.evaluate({
                name: PermissionName.USER_AUTHENTICATOR_READ,
                data: definePolicyData({
                    [BuiltInPolicyType.ATTRIBUTES]: entity,
                    ...this.resourceRealmMatch(entity),
                }),
            });
        }

        return this.sanitize(entity);
    }

    protected async resolveOne(id: string, userId?: string): Promise<UserAuthenticator> {
        const entity = await this.repository.findOneById(id);
        // a device of another user is a 404 on the nested route — never
        // an existence oracle across users.
        if (!entity || (userId && entity.user_id !== userId)) {
            throw new EntityNotFoundError();
        }

        return entity;
    }

    // ------------------------------------------------------------------

    async enroll(data: Record<string, any>, actor: ActorContext): Promise<UserAuthenticatorEnrollResult> {
        this.assertEnabled();

        const validated = await this.validator.run(data, { group: ValidatorGroup.CREATE });

        const user = await this.resolveTargetUser(validated.user_id, actor, validated);

        switch (validated.kind) {
            case UserAuthenticatorKind.TOTP: {
                return this.enrollTotp(user, validated.name ?? null);
            }
            case UserAuthenticatorKind.RECOVERY: {
                return this.enrollRecovery(user, validated.name ?? null);
            }
            default: {
                throw new BadRequestError(`The authenticator kind ${validated.kind} can not be enrolled yet.`);
            }
        }
    }

    protected async resolveTargetUser(
        userId: string | undefined,
        actor: ActorContext,
        validated: Record<string, any>,
    ): Promise<User> {
        const actorUser : User | undefined = actor.identity && actor.identity.type === IdentityType.USER ?
            actor.identity.data as User :
            undefined;

        if (!userId || (actorUser && actorUser.id === userId)) {
            if (!actorUser) {
                throw new UnauthorizedError();
            }

            return actorUser;
        }

        const target = await this.userRepository.findOneById(userId);
        if (!target) {
            throw new EntityNotFoundError();
        }

        await actor.permissionEvaluator.preEvaluate({ name: PermissionName.USER_AUTHENTICATOR_CREATE });
        await actor.permissionEvaluator.evaluate({
            name: PermissionName.USER_AUTHENTICATOR_CREATE,
            data: definePolicyData({
                [BuiltInPolicyType.ATTRIBUTES]: { ...validated, realm_id: target.realm_id },
                ...this.resourceRealmMatch(target),
            }),
        });

        return target;
    }

    protected async enrollTotp(user: User, name: string | null): Promise<UserAuthenticatorEnrollResult> {
        const cipher = this.assertCipher();

        const secret = new Secret({ size: 20 });
        const parameters : UserAuthenticatorTotpParameters = {
            algorithm: USER_AUTHENTICATOR_TOTP_ALGORITHM,
            digits: USER_AUTHENTICATOR_TOTP_DIGITS,
            period: USER_AUTHENTICATOR_TOTP_PERIOD,
        };

        const totp = new TOTP({
            issuer: this.options.issuer ?? 'authup',
            label: user.name,
            algorithm: parameters.algorithm,
            digits: parameters.digits,
            period: parameters.period,
            secret,
        });
        const uri = totp.toString();

        let entity = this.repository.create({
            kind: UserAuthenticatorKind.TOTP,
            name,
            secret: await cipher.encrypt(secret.base32),
            parameters: JSON.stringify(parameters),
            confirmed: false,
            user_id: user.id,
            realm_id: user.realm_id,
        });
        entity = await this.repository.save(entity);

        return {
            entity: this.sanitize(entity),
            secret: secret.base32,
            uri,
            qr: await QRCode.toDataURL(uri),
        };
    }

    protected async enrollRecovery(user: User, name: string | null): Promise<UserAuthenticatorEnrollResult> {
        const codes : string[] = [];
        const stored : UserAuthenticatorRecoveryCode[] = [];
        for (let i = 0; i < USER_AUTHENTICATOR_RECOVERY_CODE_COUNT; i++) {
            const code = generateRecoveryCode();
            codes.push(code);
            stored.push({ hash: await hash(code), used_at: null });
        }

        // regenerate semantics: a user holds ONE recovery-code set. Reuse the
        // existing row via a single atomic save instead of delete-then-insert,
        // so a mid-operation failure can never leave the user with no codes.
        const [existing] = await this.repository.findAllWithSecretsByUser(user.id, { kind: UserAuthenticatorKind.RECOVERY });

        let entity : UserAuthenticator;
        if (existing) {
            existing.name = name;
            existing.codes = JSON.stringify(stored);
            existing.confirmed = true;
            entity = await this.repository.save(existing);
        } else {
            entity = this.repository.create({
                kind: UserAuthenticatorKind.RECOVERY,
                name,
                codes: JSON.stringify(stored),
                confirmed: true,
                user_id: user.id,
                realm_id: user.realm_id,
            });
            entity = await this.repository.save(entity);
        }

        await this.recordEvent(EventName.MFA_ENROLLED, entity);

        return {
            entity: this.sanitize(entity),
            codes,
        };
    }

    // ------------------------------------------------------------------

    async confirm(
        id: string,
        code: string,
        actor: ActorContext,
        options: { userId?: string } = {},
    ): Promise<UserAuthenticator> {
        const entity = await this.resolveOne(id, options.userId);

        if (!this.isOwnedBy(entity, actor)) {
            await actor.permissionEvaluator.preEvaluate({ name: PermissionName.USER_AUTHENTICATOR_UPDATE });
            await actor.permissionEvaluator.evaluate({
                name: PermissionName.USER_AUTHENTICATOR_UPDATE,
                data: definePolicyData({
                    [BuiltInPolicyType.ATTRIBUTES]: entity,
                    ...this.resourceRealmMatch(entity),
                }),
            });
        }

        if (entity.confirmed) {
            return this.sanitize(entity);
        }

        if (entity.kind !== UserAuthenticatorKind.TOTP) {
            throw new BadRequestError(`The authenticator kind ${entity.kind} can not be confirmed with a code.`);
        }

        await this.assertNotThrottled(entity.user_id);

        const withSecrets = await this.repository.findOneWithSecretsById(entity.id);
        if (!withSecrets) {
            throw new EntityNotFoundError();
        }

        if (!await this.verifyTotp(withSecrets, code)) {
            await this.bumpAttempts(entity.user_id);
            throw new EntityCredentialsInvalidError();
        }

        await this.resetAttempts(entity.user_id);

        entity.confirmed = true;
        // The consumed step is tracked only on the login-verify path (below),
        // NOT here — so a legitimate first login in the same window as the
        // confirmation is still accepted; only a repeat of an already-used
        // LOGIN code is rejected.
        const output = await this.repository.save(entity);

        await this.recordEvent(EventName.MFA_ENROLLED, output);

        return this.sanitize(output);
    }

    async delete(
        id: string,
        actor: ActorContext,
        options: { userId?: string } = {},
    ): Promise<UserAuthenticator> {
        const entity = await this.resolveOne(id, options.userId);

        if (!this.isOwnedBy(entity, actor)) {
            await actor.permissionEvaluator.preEvaluate({ name: PermissionName.USER_AUTHENTICATOR_DELETE });
            await actor.permissionEvaluator.evaluate({
                name: PermissionName.USER_AUTHENTICATOR_DELETE,
                data: definePolicyData({
                    [BuiltInPolicyType.ATTRIBUTES]: entity,
                    ...this.resourceRealmMatch(entity),
                }),
            });
        }

        const { id: entityId } = entity;
        await this.repository.remove(entity);
        entity.id = entityId;

        await this.recordEvent(EventName.MFA_REMOVED, entity);

        return this.sanitize(entity);
    }

    // ------------------------------------------------------------------

    async verify(
        userId: string,
        input: UserAuthenticatorVerifyInput,
        ctx: UserAuthenticatorVerifyContext = {},
    ): Promise<boolean> {
        await this.assertNotThrottled(userId);

        const devices = await this.repository.findAllWithSecretsByUser(userId, {
            kind: input.kind,
            confirmed: true,
        });

        let matched : UserAuthenticator | undefined;

        for (const device of devices) {
            if (input.kind === UserAuthenticatorKind.TOTP) {
                if (await this.verifyTotp(device, input.response)) {
                    matched = device;
                }
            }

            if (input.kind === UserAuthenticatorKind.RECOVERY) {
                if (await this.verifyRecovery(device, input.response)) {
                    matched = device;
                }
            }

            if (matched) {
                break;
            }
        }

        if (!matched) {
            await this.bumpAttempts(userId);
            await this.recordChallengeEvent(EventName.MFA_CHALLENGE_FAILED, userId, input.kind, ctx);
            return false;
        }

        matched.last_used_at = new Date().toISOString();
        try {
            await this.repository.save(matched);
        } catch (e) {
            // A concurrent verify already consumed this factor (optimistic-lock
            // conflict on the row version) — treat as a failed attempt, not a
            // 500, so the single-use / anti-replay guarantee holds.
            if (isEntityConflictError(e)) {
                await this.bumpAttempts(userId);
                await this.recordChallengeEvent(EventName.MFA_CHALLENGE_FAILED, userId, input.kind, ctx);
                return false;
            }
            throw e;
        }

        await this.resetAttempts(userId);

        await this.recordChallengeEvent(EventName.MFA_VERIFIED, userId, input.kind, ctx, matched);

        return true;
    }

    protected async verifyTotp(device: UserAuthenticator, token: string): Promise<boolean> {
        if (!device.secret) {
            return false;
        }

        const cipher = this.assertCipher();

        let parameters : UserAuthenticatorTotpParameters = {
            algorithm: USER_AUTHENTICATOR_TOTP_ALGORITHM,
            digits: USER_AUTHENTICATOR_TOTP_DIGITS,
            period: USER_AUTHENTICATOR_TOTP_PERIOD,
        };
        if (device.parameters) {
            parameters = { ...parameters, ...JSON.parse(device.parameters) };
        }

        const totp = new TOTP({
            algorithm: parameters.algorithm,
            digits: parameters.digits,
            period: parameters.period,
            secret: Secret.fromBase32(await cipher.decrypt(device.secret)),
        });

        const delta = totp.validate({ token: token.trim(), window: 1 });
        if (delta === null) {
            return false;
        }

        // Reject replay: the accepted step must strictly advance past the last
        // consumed one (RFC 6238 §5.2), so a captured code can't be reused
        // within its ±1 validation window. The version column makes the
        // concurrent case (two verifies advancing the same step) conflict-safe.
        const step = Math.floor(Date.now() / 1000 / parameters.period) + delta;
        if (typeof parameters.counter === 'number' && step <= parameters.counter) {
            return false;
        }

        // persist the consumed step onto the device — the caller saves the row.
        device.parameters = JSON.stringify({ ...parameters, counter: step });
        return true;
    }

    protected async verifyRecovery(device: UserAuthenticator, code: string): Promise<boolean> {
        if (!device.codes) {
            return false;
        }

        const entries = JSON.parse(device.codes) as UserAuthenticatorRecoveryCode[];
        const normalized = code.trim().toLowerCase();

        for (const entry of entries) {
            if (entry.used_at) {
                continue;
            }

            if (await compare(normalized, entry.hash)) {
                entry.used_at = new Date().toISOString();
                device.codes = JSON.stringify(entries);
                return true;
            }
        }

        return false;
    }

    // ------------------------------------------------------------------

    async hasConfirmed(userId: string): Promise<boolean> {
        return this.repository.hasConfirmedByUser(userId);
    }

    async challenge(userId: string): Promise<UserAuthenticatorChallengeStatus> {
        if (!this.options.enabled) {
            return {
                required: false, 
                enrollmentRequired: false, 
                kinds: [], 
            };
        }

        const devices = await this.repository.findAllByUser(userId);
        const confirmed = devices.filter((device) => device.confirmed);

        const kinds = Array.from(new Set(confirmed.map((device) => device.kind)));

        return {
            required: confirmed.length > 0,
            enrollmentRequired: !!this.options.required && confirmed.length === 0,
            kinds,
        };
    }

    // ------------------------------------------------------------------

    protected assertEnabled(): void {
        if (!this.options.enabled) {
            throw new AuthupError({
                code: ErrorCode.MFA_NOT_CONFIGURABLE,
                message: 'Multi-factor authentication is not enabled.',
            });
        }
    }

    protected assertCipher(): ISymmetricCipher {
        // fail-closed: never store or read a seed without a real key.
        if (!this.cipher) {
            throw new AuthupError({
                code: ErrorCode.MFA_NOT_CONFIGURABLE,
                message: 'Multi-factor authentication requires a configured encryption key (MFA_ENCRYPTION_KEY).',
            });
        }

        return this.cipher;
    }

    // ------------------------------------------------------------------

    protected buildAttemptCacheKey(userId: string): string {
        return buildCacheKey({
            prefix: USER_AUTHENTICATOR_ATTEMPT_CACHE_PREFIX,
            key: userId,
        });
    }

    protected async assertNotThrottled(userId: string): Promise<void> {
        const state = await this.cache.get<AttemptState>(this.buildAttemptCacheKey(userId));
        if (state && state.lockedUntil > Date.now()) {
            throw new MfaThrottledError({ retryAfter: Math.ceil((state.lockedUntil - Date.now()) / 1_000) });
        }
    }

    protected async bumpAttempts(userId: string): Promise<void> {
        const key = this.buildAttemptCacheKey(userId);
        const state = (await this.cache.get<AttemptState>(key)) ?? { count: 0, lockedUntil: 0 };

        state.count += 1;

        const delay = Math.min(
            USER_AUTHENTICATOR_ATTEMPT_LOCK_MAX,
            USER_AUTHENTICATOR_ATTEMPT_LOCK_FACTOR * (2 ** (state.count - 1)),
        );
        state.lockedUntil = Date.now() + (delay * 1_000);

        await this.cache.set(key, state, { ttl: USER_AUTHENTICATOR_ATTEMPT_WINDOW * 1_000 });
    }

    protected async resetAttempts(userId: string): Promise<void> {
        await this.cache.drop(this.buildAttemptCacheKey(userId));
    }

    // ------------------------------------------------------------------

    protected async recordEvent(
        name: `${EventName}`,
        entity: UserAuthenticator,
    ): Promise<void> {
        await this.eventService?.record({
            scope: EventScope.IDENTITY,
            name,
            refType: EventRefType.USER_AUTHENTICATOR,
            refId: entity.id,
            actorType: IdentityType.USER,
            actorId: entity.user_id,
            realmId: entity.realm_id,
            data: { kind: entity.kind },
        });
    }

    protected async recordChallengeEvent(
        name: `${EventName}`,
        userId: string,
        kind: string,
        ctx: UserAuthenticatorVerifyContext,
        entity?: UserAuthenticator,
    ): Promise<void> {
        await this.eventService?.record({
            scope: EventScope.IDENTITY,
            name,
            refType: EventRefType.USER,
            refId: userId,
            actorType: IdentityType.USER,
            actorId: userId,
            clientId: ctx.clientId ?? null,
            realmId: entity?.realm_id ?? null,
            requestIpAddress: ctx.ipAddress ?? null,
            requestUserAgent: ctx.userAgent ?? null,
            data: { kind },
        });
    }
}
