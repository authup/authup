/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { RequestBaseOptions } from 'hapic';
import { stringifyAuthorizationHeader } from 'hapic';
import type { EntityQueryInput } from '../../../helpers';
import { buildQueryString } from '../../../helpers';
import type { User, UserAuthenticator } from '@authup/core-kit';
import { nullifyEmptyObjectProperties } from '../../../utils';
import { BaseAPI } from '../../base';
import type { EntityCollectionResponse, EntityRecordResponse } from '../../types-base';
import type {
    IUserAuthenticatorAPI,
    UserAuthenticatorChallengeRequestOptions,
    UserAuthenticatorChallengeResponse,
    UserAuthenticatorChallengeSendPayload,
    UserAuthenticatorChallengeVerifyPayload,
    UserAuthenticatorChallengeVerifyResponse,
    UserAuthenticatorConfirmPayload,
    UserAuthenticatorCreatePayload,
    UserAuthenticatorEnrollResponse,
} from './types';

export class UserAuthenticatorAPI extends BaseAPI implements IUserAuthenticatorAPI {
    async getMany(
        userId: User['id'] | string,
        data?: EntityQueryInput<UserAuthenticator>,
    ): Promise<EntityCollectionResponse<UserAuthenticator>> {
        const response = await this.client.get(`users/${userId}/authenticators${buildQueryString(data)}`);
        return response.data;
    }

    async getOne(
        userId: User['id'] | string,
        id: UserAuthenticator['id'],
    ): Promise<EntityRecordResponse<UserAuthenticator>> {
        const response = await this.client.get(`users/${userId}/authenticators/${id}`);
        return response.data;
    }

    async enroll(
        userId: User['id'] | string,
        data: UserAuthenticatorCreatePayload,
    ): Promise<UserAuthenticatorEnrollResponse> {
        const response = await this.client.post(`users/${userId}/authenticators`, nullifyEmptyObjectProperties(data));
        return response.data;
    }

    async confirm(
        userId: User['id'] | string,
        id: UserAuthenticator['id'],
        data: UserAuthenticatorConfirmPayload,
    ): Promise<EntityRecordResponse<UserAuthenticator>> {
        const response = await this.client.post(`users/${userId}/authenticators/${id}/confirm`, data);
        return response.data;
    }

    async delete(
        userId: User['id'] | string,
        id: UserAuthenticator['id'],
    ): Promise<EntityRecordResponse<UserAuthenticator>> {
        const response = await this.client.delete(`users/${userId}/authenticators/${id}`);
        return response.data;
    }

    async challenge(
        options?: UserAuthenticatorChallengeRequestOptions,
    ): Promise<UserAuthenticatorChallengeResponse> {
        const url = options && options.acrValues ?
            `authenticators/challenge?acrValues=${encodeURIComponent(options.acrValues)}` :
            'authenticators/challenge';

        const response = await this.client.get(
            url,
            buildUserAuthenticatorChallengeRequestConfig(options),
        );
        return response.data;
    }

    async sendChallenge(
        data: UserAuthenticatorChallengeSendPayload,
        options?: UserAuthenticatorChallengeRequestOptions,
    ): Promise<{ success: boolean }> {
        const response = await this.client.post(
            'authenticators/challenge/send',
            data,
            buildUserAuthenticatorChallengeRequestConfig(options),
        );
        return response.data;
    }

    async verifyChallenge(
        data: UserAuthenticatorChallengeVerifyPayload,
        options?: UserAuthenticatorChallengeRequestOptions,
    ): Promise<UserAuthenticatorChallengeVerifyResponse> {
        const response = await this.client.post(
            'authenticators/challenge',
            data,
            buildUserAuthenticatorChallengeRequestConfig(options),
        );
        return response.data;
    }
}

function buildUserAuthenticatorChallengeRequestConfig(
    options?: UserAuthenticatorChallengeRequestOptions,
) : RequestBaseOptions | undefined {
    if (!options || !options.authorizationHeader) {
        return undefined;
    }

    return {
        headers: {
            Authorization: typeof options.authorizationHeader === 'string' ?
                options.authorizationHeader :
                stringifyAuthorizationHeader(options.authorizationHeader),
        },
    };
}
