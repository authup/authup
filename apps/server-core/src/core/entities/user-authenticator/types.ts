/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { UserAuthenticator, UserAuthenticatorKind } from '@authup/core-kit';
import type {
    ActorContext,
    EntityRepositoryFindManyResult,
    ICache,
    ISymmetricCipher,
} from '@authup/server-kit';
import type { IEventService } from '../event/index.ts';
import type { IMailClient, IMailTemplateRenderer } from '../../mail/index.ts';
import type { IUserRepository } from '../user/index.ts';

export const USER_AUTHENTICATOR_FILTER_KEYS = [
    'id', 
    'kind', 
    'confirmed', 
    'user_id', 
    'realm_id',
] as const;

export type UserAuthenticatorOwner = {
    userId: string,
};

export type UserAuthenticatorFindManyOptions = {
    owner?: UserAuthenticatorOwner,
};

export type UserAuthenticatorSecretsFilter = {
    kind?: `${UserAuthenticatorKind}`,
    confirmed?: boolean,
};

export interface IUserAuthenticatorRepository {
    findMany(
        query: Record<string, any>,
        options?: UserAuthenticatorFindManyOptions
    ): Promise<EntityRepositoryFindManyResult<UserAuthenticator>>;

    findOneById(id: string): Promise<UserAuthenticator | null>;

    /**
     * Like findOneById, but force-selects the secret/codes columns
     * (select:false). Verification-path only — never for read endpoints.
     */
    findOneWithSecretsById(id: string): Promise<UserAuthenticator | null>;

    findAllByUser(userId: string): Promise<UserAuthenticator[]>;

    findAllWithSecretsByUser(
        userId: string,
        filter?: UserAuthenticatorSecretsFilter
    ): Promise<UserAuthenticator[]>;

    hasConfirmedByUser(userId: string): Promise<boolean>;

    create(data: Partial<UserAuthenticator>): UserAuthenticator;

    save(entity: UserAuthenticator): Promise<UserAuthenticator>;

    remove(entity: UserAuthenticator): Promise<void>;

    removeAllByUser(userId: string, kind: `${UserAuthenticatorKind}`): Promise<void>;
}

/**
 * Stored on a recovery row's `codes` column as a JSON array.
 */
export type UserAuthenticatorRecoveryCode = {
    hash: string,
    used_at: string | null,
};

/**
 * Stored on a TOTP row's `parameters` column as JSON.
 */
export type UserAuthenticatorTotpParameters = {
    algorithm: string,
    digits: number,
    period: number,
    /**
     * Last accepted TOTP step (absolute period counter). A verify only
     * succeeds for a strictly greater step — rejects replay within the
     * validation window (RFC 6238 §5.2).
     */
    counter?: number,
};

export type UserAuthenticatorEnrollResult = {
    entity: UserAuthenticator,
    /**
     * TOTP: the raw base32 seed — present in the enroll response only,
     * never in a subsequent read.
     */
    secret?: string,
    /**
     * TOTP: the otpauth:// provisioning URI.
     */
    uri?: string,
    /**
     * TOTP: the provisioning URI rendered as a PNG data-URI (QR code).
     */
    qr?: string,
    /**
     * Recovery: the raw single-use codes — shown once (download/print).
     */
    codes?: string[],
};

export type UserAuthenticatorChallengeStatus = {
    /**
     * The subject holds at least one confirmed device (and MFA is enabled)
     * — a second factor must be presented.
     */
    required: boolean,
    /**
     * MFA is enforced org-wide (mfaRequired) and the subject has no
     * confirmed device — the UI routes to inline enrollment.
     */
    enrollmentRequired: boolean,
    /**
     * Device kinds the subject can be challenged with.
     */
    kinds: `${UserAuthenticatorKind}`[],
    /**
     * Kind-specific challenge payload (absent for TOTP/recovery;
     * WebAuthn request options in a later stage).
     */
    challenge?: Record<string, unknown>,
};

export type UserAuthenticatorVerifyInput = {
    kind: `${UserAuthenticatorKind}`,
    response: string,
};

export type UserAuthenticatorVerifyContext = {
    ipAddress?: string | null,
    userAgent?: string | null,
    clientId?: string | null,
};

/**
 * The login-time seam: computes whether (and how) a subject must be
 * challenged. Consumed by the authorize backstop and the password grant.
 */
export interface IUserAuthenticatorChallengeProvider {
    challenge(userId: string): Promise<UserAuthenticatorChallengeStatus>;
}

export interface IUserAuthenticatorService extends IUserAuthenticatorChallengeProvider {
    getMany(
        query: Record<string, any>,
        actor: ActorContext,
        options?: { userId?: string }
    ): Promise<EntityRepositoryFindManyResult<UserAuthenticator>>;

    getOne(id: string, actor: ActorContext, options?: { userId?: string }): Promise<UserAuthenticator>;

    enroll(data: Record<string, any>, actor: ActorContext): Promise<UserAuthenticatorEnrollResult>;

    confirm(id: string, code: string, actor: ActorContext, options?: { userId?: string }): Promise<UserAuthenticator>;

    delete(id: string, actor: ActorContext, options?: { userId?: string }): Promise<UserAuthenticator>;

    verify(
        userId: string,
        input: UserAuthenticatorVerifyInput,
        ctx?: UserAuthenticatorVerifyContext
    ): Promise<boolean>;

    /**
     * Issue a kind-specific challenge (email OTP: generate + mail a code).
     * A no-op for kinds whose challenge material is client-derived (TOTP).
     */
    sendChallenge(
        userId: string,
        kind: `${UserAuthenticatorKind}`,
        ctx?: UserAuthenticatorSendContext
    ): Promise<void>;

    hasConfirmed(userId: string): Promise<boolean>;
}

export type UserAuthenticatorSendContext = {
    locale?: string,
};

export type UserAuthenticatorServiceOptions = {
    /**
     * Org-wide MFA feature toggle (config: mfaEnabled).
     */
    enabled?: boolean,
    /**
     * Enforce MFA for every user (config: mfaRequired) — users without a
     * confirmed device are routed to inline enrollment at next login.
     */
    required?: boolean,
    /**
     * Issuer label for otpauth:// provisioning URIs.
     */
    issuer?: string,
};

export type UserAuthenticatorServiceContext = {
    repository: IUserAuthenticatorRepository,
    userRepository: IUserRepository,
    cache: ICache,
    /**
     * Cipher over the config mfaEncryptionKey. Null when no key is
     * configured — TOTP enrollment then fails closed.
     */
    cipher?: ISymmetricCipher | null,
    eventService?: IEventService,
    /**
     * Mail dependencies for the email-OTP kind (absent = email OTP
     * enrollment/send is refused).
     */
    mailClient?: IMailClient,
    mailTemplateRenderer?: IMailTemplateRenderer,
    options?: UserAuthenticatorServiceOptions,
};
