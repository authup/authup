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
import type { AuthenticationResponseJSON, RegistrationResponseJSON } from '@simplewebauthn/server';
import type { IEventService } from '../event/index.ts';
import type { IMailClient, IMailTemplateRenderer } from '../../mail/index.ts';
import { MailTemplateName } from '../../mail/index.ts';
import type { IUserRepository } from '../user/index.ts';
import {
    buildWebauthnAuthenticationOptions,
    buildWebauthnRegistrationOptions,
    verifyWebauthnAuthentication,
    verifyWebauthnRegistration,
} from './webauthn.ts';
import {
    USER_AUTHENTICATOR_ATTEMPT_CACHE_PREFIX,
    USER_AUTHENTICATOR_ATTEMPT_LOCK_FACTOR,
    USER_AUTHENTICATOR_ATTEMPT_LOCK_MAX,
    USER_AUTHENTICATOR_ATTEMPT_WINDOW,
    USER_AUTHENTICATOR_EMAIL_CODE_CACHE_PREFIX,
    USER_AUTHENTICATOR_EMAIL_CODE_EXPIRES_IN_MINUTES,
    USER_AUTHENTICATOR_EMAIL_CODE_LENGTH,
    USER_AUTHENTICATOR_RECOVERY_CODE_COUNT,
    USER_AUTHENTICATOR_TOTP_ALGORITHM,
    USER_AUTHENTICATOR_TOTP_DIGITS,
    USER_AUTHENTICATOR_TOTP_PERIOD,
    USER_AUTHENTICATOR_WEBAUTHN_AUTH_CACHE_PREFIX,
    USER_AUTHENTICATOR_WEBAUTHN_CHALLENGE_WINDOW,
    USER_AUTHENTICATOR_WEBAUTHN_REG_CACHE_PREFIX,
} from './constants.ts';
import { generateNumericCode, generateRecoveryCode } from './helpers.ts';
import type {
    IUserAuthenticatorRepository,
    IUserAuthenticatorService,
    UserAuthenticatorChallengeStatus,
    UserAuthenticatorEnrollResult,
    UserAuthenticatorRecoveryCode,
    UserAuthenticatorSendContext,
    UserAuthenticatorServiceContext,
    UserAuthenticatorServiceOptions,
    UserAuthenticatorTotpParameters,
    UserAuthenticatorVerifyContext,
    UserAuthenticatorVerifyInput,
    UserAuthenticatorWebauthnParameters,
} from './types.ts';
import type { WebauthnContext } from './webauthn.ts';

type AttemptState = {
    count: number,
    lockedUntil: number,
};

type EmailCodeState = {
    hash: string,
    expiresAt: number,
};

type WebauthnChallengeState = {
    challenge: string,
    expiresAt: number,
};

export class UserAuthenticatorService extends AbstractEntityService implements IUserAuthenticatorService {
    protected repository: IUserAuthenticatorRepository;

    protected userRepository: IUserRepository;

    protected cache: ICache;

    protected cipher: ISymmetricCipher | null;

    protected eventService?: IEventService;

    protected mailClient?: IMailClient;

    protected mailTemplateRenderer?: IMailTemplateRenderer;

    protected options: UserAuthenticatorServiceOptions;

    protected validator: UserAuthenticatorValidator;

    constructor(ctx: UserAuthenticatorServiceContext) {
        super();

        this.repository = ctx.repository;
        this.userRepository = ctx.userRepository;
        this.cache = ctx.cache;
        this.cipher = ctx.cipher ?? null;
        this.eventService = ctx.eventService;
        this.mailClient = ctx.mailClient;
        this.mailTemplateRenderer = ctx.mailTemplateRenderer;
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
            case UserAuthenticatorKind.EMAIL: {
                return this.enrollEmail(user, validated.name ?? null);
            }
            case UserAuthenticatorKind.WEBAUTHN: {
                return this.enrollWebauthn(user, validated.name ?? null);
            }
            default: {
                throw new BadRequestError(`The authenticator kind ${validated.kind} can not be enrolled yet.`);
            }
        }
    }

    protected async enrollWebauthn(user: User, name: string | null): Promise<UserAuthenticatorEnrollResult> {
        const ctx = this.assertWebauthn();

        // exclude already-registered credentials from a fresh ceremony
        const existing = await this.repository.findAllWithSecretsByUser(user.id, {
            kind: UserAuthenticatorKind.WEBAUTHN,
            confirmed: true,
        });
        const excludeCredentials = existing
            .map((device) => this.parseWebauthnParameters(device))
            .filter((parameters): parameters is UserAuthenticatorWebauthnParameters => !!parameters)
            .map((parameters) => ({ id: parameters.credential_id, transports: parameters.transports }));

        const { options, challenge } = await buildWebauthnRegistrationOptions(
            ctx,
            { id: user.id, name: user.name },
            excludeCredentials,
        );

        await this.cache.set(
            this.buildWebauthnCacheKey(USER_AUTHENTICATOR_WEBAUTHN_REG_CACHE_PREFIX, user.id),
            {
                challenge,
                expiresAt: Date.now() + (USER_AUTHENTICATOR_WEBAUTHN_CHALLENGE_WINDOW * 1_000),
            } satisfies WebauthnChallengeState,
            { ttl: USER_AUTHENTICATOR_WEBAUTHN_CHALLENGE_WINDOW * 1_000 },
        );

        let entity = this.repository.create({
            kind: UserAuthenticatorKind.WEBAUTHN,
            name,
            confirmed: false,
            user_id: user.id,
            realm_id: user.realm_id,
        });
        entity = await this.repository.save(entity);

        return {
            entity: this.sanitize(entity),
            webauthn: options,
        };
    }

    protected async enrollEmail(user: User, name: string | null): Promise<UserAuthenticatorEnrollResult> {
        this.assertMail();

        // The actor identity may not carry `email` (the User entity's email
        // column is select:false) — force-load it to confirm the mailbox
        // exists. The email is presumed verified (activation); the row marks
        // the mailbox as an enrolled factor, codes are transient (cache).
        const email = user.email ?? (await this.userRepository.findOneByWithEmail({ id: user.id }))?.email;
        if (!email) {
            throw new BadRequestError('The user has no email address to receive codes.');
        }

        // one email factor per user
        await this.repository.removeAllByUser(user.id, UserAuthenticatorKind.EMAIL);

        let entity = this.repository.create({
            kind: UserAuthenticatorKind.EMAIL,
            name,
            confirmed: true,
            user_id: user.id,
            realm_id: user.realm_id,
        });
        entity = await this.repository.save(entity);

        await this.recordEvent(EventName.MFA_ENROLLED, entity);

        return { entity: this.sanitize(entity) };
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

        if (entity.kind === UserAuthenticatorKind.WEBAUTHN) {
            return this.confirmWebauthn(entity, code);
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
        const output = await this.repository.save(entity);

        await this.recordEvent(EventName.MFA_ENROLLED, output);

        return this.sanitize(output);
    }

    protected async confirmWebauthn(entity: UserAuthenticator, response: string): Promise<UserAuthenticator> {
        const ctx = this.assertWebauthn();

        const state = await this.cache.get<WebauthnChallengeState>(
            this.buildWebauthnCacheKey(USER_AUTHENTICATOR_WEBAUTHN_REG_CACHE_PREFIX, entity.user_id),
        );
        if (!state || state.expiresAt < Date.now()) {
            throw new EntityCredentialsInvalidError();
        }

        let parsed : RegistrationResponseJSON;
        try {
            parsed = JSON.parse(response) as RegistrationResponseJSON;
        } catch {
            throw new BadRequestError('The registration response is malformed.');
        }

        const credential = await verifyWebauthnRegistration(ctx, parsed, state.challenge);
        if (!credential) {
            throw new EntityCredentialsInvalidError();
        }

        await this.cache.drop(this.buildWebauthnCacheKey(USER_AUTHENTICATOR_WEBAUTHN_REG_CACHE_PREFIX, entity.user_id));

        entity.parameters = JSON.stringify(credential);
        entity.confirmed = true;
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

            if (input.kind === UserAuthenticatorKind.EMAIL) {
                if (await this.verifyEmail(userId, input.response)) {
                    matched = device;
                }
            }

            if (input.kind === UserAuthenticatorKind.WEBAUTHN) {
                const newCounter = await this.verifyWebauthnDevice(userId, device, input.response);
                if (newCounter !== null) {
                    // persist the signature counter (replay defense)
                    const parameters = this.parseWebauthnParameters(device);
                    if (parameters) {
                        device.parameters = JSON.stringify({ ...parameters, counter: newCounter });
                    }
                    await this.cache.drop(
                        this.buildWebauthnCacheKey(USER_AUTHENTICATOR_WEBAUTHN_AUTH_CACHE_PREFIX, userId),
                    );
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

        await this.resetAttempts(userId);

        matched.last_used_at = new Date().toISOString();
        await this.repository.save(matched);

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

        return totp.validate({ token: token.trim(), window: 1 }) !== null;
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

    protected parseWebauthnParameters(device: UserAuthenticator): UserAuthenticatorWebauthnParameters | null {
        if (!device.parameters) {
            return null;
        }
        try {
            return JSON.parse(device.parameters) as UserAuthenticatorWebauthnParameters;
        } catch {
            return null;
        }
    }

    protected async verifyWebauthnDevice(
        userId: string,
        device: UserAuthenticator,
        response: string,
    ): Promise<number | null> {
        const ctx = this.assertWebauthn();

        const parameters = this.parseWebauthnParameters(device);
        if (!parameters) {
            return null;
        }

        let parsed : AuthenticationResponseJSON;
        try {
            parsed = JSON.parse(response) as AuthenticationResponseJSON;
        } catch {
            return null;
        }

        // the assertion identifies the credential — only verify against its row
        if (parsed.id !== parameters.credential_id) {
            return null;
        }

        const state = await this.cache.get<WebauthnChallengeState>(
            this.buildWebauthnCacheKey(USER_AUTHENTICATOR_WEBAUTHN_AUTH_CACHE_PREFIX, userId),
        );
        if (!state || state.expiresAt < Date.now()) {
            return null;
        }

        try {
            const result = await verifyWebauthnAuthentication(ctx, parsed, state.challenge, parameters);
            return result.verified ? result.newCounter : null;
        } catch {
            return null;
        }
    }

    protected async verifyEmail(userId: string, response: string): Promise<boolean> {
        const key = this.buildEmailCodeCacheKey(userId);
        const state = await this.cache.get<EmailCodeState>(key);
        if (!state || state.expiresAt < Date.now()) {
            return false;
        }

        if (!await compare(response.trim(), state.hash)) {
            return false;
        }

        // single-use — drop the code once consumed
        await this.cache.drop(key);
        return true;
    }

    // ------------------------------------------------------------------

    async sendChallenge(
        userId: string,
        kind: `${UserAuthenticatorKind}`,
        ctx: UserAuthenticatorSendContext = {},
    ): Promise<void> {
        // Only email needs a server-issued challenge; TOTP/recovery are
        // client-derived (no-op keeps the endpoint uniform).
        if (kind !== UserAuthenticatorKind.EMAIL) {
            return;
        }

        this.assertMail();
        await this.assertNotThrottled(userId);

        // require a CONFIRMED email factor — never mail a code to a user who
        // did not enroll email (no code-spray oracle).
        const devices = await this.repository.findAllWithSecretsByUser(userId, {
            kind: UserAuthenticatorKind.EMAIL,
            confirmed: true,
        });
        if (devices.length === 0) {
            return;
        }

        // email column is select:false — force-load it for the recipient.
        const user = await this.userRepository.findOneByWithEmail({ id: userId });
        if (!user || !user.email) {
            return;
        }

        const codeValue = generateNumericCode(USER_AUTHENTICATOR_EMAIL_CODE_LENGTH);
        await this.cache.set(
            this.buildEmailCodeCacheKey(userId),
            {
                hash: await hash(codeValue),
                expiresAt: Date.now() + (USER_AUTHENTICATOR_EMAIL_CODE_EXPIRES_IN_MINUTES * 60 * 1_000),
            } satisfies EmailCodeState,
            { ttl: USER_AUTHENTICATOR_EMAIL_CODE_EXPIRES_IN_MINUTES * 60 * 1_000 },
        );

        const mail = await this.mailTemplateRenderer!.render({
            template: MailTemplateName.MFA_EMAIL_OTP,
            params: {
                code: codeValue,
                expiresInMinutes: USER_AUTHENTICATOR_EMAIL_CODE_EXPIRES_IN_MINUTES,
            },
            locale: ctx.locale,
        });

        await this.mailClient!.send({
            to: user.email,
            ...mail,
        });
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

        const status : UserAuthenticatorChallengeStatus = {
            required: confirmed.length > 0,
            enrollmentRequired: !!this.options.required && confirmed.length === 0,
            kinds,
        };

        // WebAuthn needs server-issued request options as the challenge — build
        // them (and store the nonce) when the subject holds a webauthn factor.
        if (kinds.includes(UserAuthenticatorKind.WEBAUTHN) && this.options.webauthn) {
            const credentials = (await this.repository.findAllWithSecretsByUser(userId, {
                kind: UserAuthenticatorKind.WEBAUTHN,
                confirmed: true,
            }))
                .map((device) => this.parseWebauthnParameters(device))
                .filter((parameters): parameters is UserAuthenticatorWebauthnParameters => !!parameters)
                .map((parameters) => ({ id: parameters.credential_id, transports: parameters.transports }));

            const { options, challenge } = await buildWebauthnAuthenticationOptions(this.options.webauthn, credentials);

            await this.cache.set(
                this.buildWebauthnCacheKey(USER_AUTHENTICATOR_WEBAUTHN_AUTH_CACHE_PREFIX, userId),
                {
                    challenge,
                    expiresAt: Date.now() + (USER_AUTHENTICATOR_WEBAUTHN_CHALLENGE_WINDOW * 1_000),
                } satisfies WebauthnChallengeState,
                { ttl: USER_AUTHENTICATOR_WEBAUTHN_CHALLENGE_WINDOW * 1_000 },
            );

            status.challenge = { webauthn: options };
        }

        return status;
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

    protected assertMail(): void {
        if (!this.mailClient || !this.mailTemplateRenderer) {
            throw new AuthupError({
                code: ErrorCode.MFA_NOT_CONFIGURABLE,
                message: 'Email-based multi-factor authentication requires a configured mail transport.',
            });
        }
    }

    protected assertWebauthn(): WebauthnContext {
        if (!this.options.webauthn) {
            throw new AuthupError({
                code: ErrorCode.MFA_NOT_CONFIGURABLE,
                message: 'WebAuthn requires a configured public URL (relying-party origin).',
            });
        }

        return this.options.webauthn;
    }

    // ------------------------------------------------------------------

    protected buildAttemptCacheKey(userId: string): string {
        return buildCacheKey({
            prefix: USER_AUTHENTICATOR_ATTEMPT_CACHE_PREFIX,
            key: userId,
        });
    }

    protected buildEmailCodeCacheKey(userId: string): string {
        return buildCacheKey({
            prefix: USER_AUTHENTICATOR_EMAIL_CODE_CACHE_PREFIX,
            key: userId,
        });
    }

    protected buildWebauthnCacheKey(prefix: string, userId: string): string {
        return buildCacheKey({ prefix, key: userId });
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
