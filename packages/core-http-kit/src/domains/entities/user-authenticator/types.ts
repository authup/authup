/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { BuildInput } from 'rapiq';
import type { User, UserAuthenticator, UserAuthenticatorKind } from '@authup/core-kit';
import type { EntityCollectionResponse, EntityRecordResponse } from '../../types-base';

export type UserAuthenticatorCreatePayload = {
    kind: `${UserAuthenticatorKind}`,
    name?: string | null,
    user_id?: string,
};

export type UserAuthenticatorEnrollResponse = {
    entity: UserAuthenticator,
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
};

export type UserAuthenticatorConfirmPayload = {
    code: string,
};

export type UserAuthenticatorChallengeResponse = {
    required: boolean,
    enrollmentRequired: boolean,
    kinds: `${UserAuthenticatorKind}`[],
    challenge?: Record<string, unknown>,
};

export type UserAuthenticatorChallengeVerifyPayload = {
    kind: `${UserAuthenticatorKind}`,
    response: string,
};

export type UserAuthenticatorChallengeVerifyResponse = {
    verified: boolean,
};

export interface IUserAuthenticatorAPI {
    getMany(
        userId: User['id'] | string,
        data?: BuildInput<UserAuthenticator>
    ): Promise<EntityCollectionResponse<UserAuthenticator>>;

    getOne(
        userId: User['id'] | string,
        id: UserAuthenticator['id']
    ): Promise<EntityRecordResponse<UserAuthenticator>>;

    enroll(
        userId: User['id'] | string,
        data: UserAuthenticatorCreatePayload
    ): Promise<UserAuthenticatorEnrollResponse>;

    confirm(
        userId: User['id'] | string,
        id: UserAuthenticator['id'],
        data: UserAuthenticatorConfirmPayload
    ): Promise<EntityRecordResponse<UserAuthenticator>>;

    delete(
        userId: User['id'] | string,
        id: UserAuthenticator['id']
    ): Promise<EntityRecordResponse<UserAuthenticator>>;

    challenge(): Promise<UserAuthenticatorChallengeResponse>;

    verifyChallenge(
        data: UserAuthenticatorChallengeVerifyPayload
    ): Promise<UserAuthenticatorChallengeVerifyResponse>;
}
