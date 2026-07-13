/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { BuildInput } from 'rapiq';
import { buildQuery } from 'rapiq';
import type { User, UserAuthenticator } from '@authup/core-kit';
import { BaseAPI } from '../../base';
import type { EntityCollectionResponse, EntityRecordResponse } from '../../types-base';
import type {
    IUserAuthenticatorAPI,
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
        data?: BuildInput<UserAuthenticator>,
    ): Promise<EntityCollectionResponse<UserAuthenticator>> {
        const response = await this.client.get(`users/${userId}/authenticators${buildQuery(data)}`);
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
        const response = await this.client.post(`users/${userId}/authenticators`, data);
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

    async challenge(): Promise<UserAuthenticatorChallengeResponse> {
        const response = await this.client.get('authenticators/challenge');
        return response.data;
    }

    async sendChallenge(
        data: UserAuthenticatorChallengeSendPayload,
    ): Promise<{ success: boolean }> {
        const response = await this.client.post('authenticators/challenge/send', data);
        return response.data;
    }

    async verifyChallenge(
        data: UserAuthenticatorChallengeVerifyPayload,
    ): Promise<UserAuthenticatorChallengeVerifyResponse> {
        const response = await this.client.post('authenticators/challenge', data);
        return response.data;
    }
}
