/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { AuthorizationHeader } from 'hapic';
import type { EntityQueryInput } from '../../../helpers';
import type { User, UserAuthenticator, UserAuthenticatorKind } from '@authup/core-kit';
import type { OAuth2TokenGrantResponse } from '@authup/specs';
import type { EntityCollectionResponse, EntityRecordWrappedResponse } from '../../types-base';

export type UserAuthenticatorCreatePayload = {
    kind: `${UserAuthenticatorKind}`,
    name?: string | null,
    userId?: string,
};

/**
 * Shown-once provisioning material riding the enroll response `meta` —
 * never part of the entity record, never in a subsequent read.
 */
export type UserAuthenticatorEnrollResponseMeta = {
    /**
     * TOTP: raw base32 seed — present in this response only.
     */
    secret?: string,
    /**
     * TOTP: otpauth:// provisioning URI.
     */
    uri?: string,
    /**
     * TOTP: provisioning URI as a PNG data-URI (QR code).
     */
    qr?: string,
    /**
     * Recovery: raw single-use codes — shown once.
     */
    codes?: string[],
    /**
     * WebAuthn: registration ceremony options for
     * `@simplewebauthn/browser`'s `startRegistration`.
     */
    webauthn?: Record<string, unknown>,
};

export type UserAuthenticatorEnrollResponse = EntityRecordWrappedResponse<
    UserAuthenticator,
    UserAuthenticatorEnrollResponseMeta
>;

export type UserAuthenticatorConfirmPayload = {
    code: string,
};

export type UserAuthenticatorChallengeResponse = {
    required: boolean,
    enrollmentRequired: boolean,
    kinds: `${UserAuthenticatorKind}`[],
    challenge?: Record<string, unknown>,
};

export type UserAuthenticatorChallengeSendPayload = {
    kind: `${UserAuthenticatorKind}`,
};

export type UserAuthenticatorChallengeVerifyPayload = {
    kind: `${UserAuthenticatorKind}`,
    response: string,
};

export type UserAuthenticatorChallengeVerifyResponse = {
    verified: boolean,
    /**
     * Present when the challenge was authenticated with an "MFA-pending"
     * login ticket (mfa_token): the full token grant for the completed
     * login (issue #3242).
     */
    token?: OAuth2TokenGrantResponse,
};

/**
 * Per-request options for the challenge surface — an MFA-pending login
 * ticket rides as an explicit bearer override (the client instance holds
 * no session yet during a fresh login).
 */
export type UserAuthenticatorChallengeRequestOptions = {
    authorizationHeader?: string | AuthorizationHeader,
};

export interface IUserAuthenticatorAPI {
    getMany(
        userId: User['id'] | string,
        data?: EntityQueryInput<UserAuthenticator>
    ): Promise<EntityCollectionResponse<UserAuthenticator>>;

    getOne(
        userId: User['id'] | string,
        id: UserAuthenticator['id']
    ): Promise<EntityRecordWrappedResponse<UserAuthenticator>>;

    enroll(
        userId: User['id'] | string,
        data: UserAuthenticatorCreatePayload
    ): Promise<UserAuthenticatorEnrollResponse>;

    confirm(
        userId: User['id'] | string,
        id: UserAuthenticator['id'],
        data: UserAuthenticatorConfirmPayload
    ): Promise<EntityRecordWrappedResponse<UserAuthenticator>>;

    delete(
        userId: User['id'] | string,
        id: UserAuthenticator['id']
    ): Promise<EntityRecordWrappedResponse<UserAuthenticator>>;

    challenge(
        options?: UserAuthenticatorChallengeRequestOptions
    ): Promise<UserAuthenticatorChallengeResponse>;

    sendChallenge(
        data: UserAuthenticatorChallengeSendPayload,
        options?: UserAuthenticatorChallengeRequestOptions
    ): Promise<{ success: boolean }>;

    verifyChallenge(
        data: UserAuthenticatorChallengeVerifyPayload,
        options?: UserAuthenticatorChallengeRequestOptions
    ): Promise<UserAuthenticatorChallengeVerifyResponse>;
}
