/*
 * Copyright (c) 2021-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { EntityQueryInput } from '../../../helpers';
import { buildQueryString } from '../../../helpers';
import type { User } from '@authup/core-kit';
import { nullifyEmptyObjectProperties } from '../../../utils';
import { BaseAPI } from '../../base';
import { buildStatsURL } from '../../stats';
import type { EntitySchemaResponse, EntityStatsQuery, EntityStatsResponse } from '../../stats';
import type { APIRequestOptions, EntityCollectionResponse, EntityRecordResponse } from '../../types-base';
import type {
    ActivateResponse,
    IUserAPI,
    PasswordForgotPayload,
    PasswordForgotResponse,
    PasswordResetPayload,
    PasswordResetResponse,
    RegisterPayload,
    RegisterResponse,
    UserCreatePayload,
    UserSavePayload,
    UserUpdatePayload,
} from './types';
import { buildRequestConfig } from '../../utils';

export class UserAPI extends BaseAPI implements IUserAPI {
    async getStats(query: EntityStatsQuery<User> = {}, options?: APIRequestOptions): Promise<EntityStatsResponse> {
        const response = await this.client.get(buildStatsURL('users', query), buildRequestConfig(options));

        return response.data;
    }

    async getSchema(options?: APIRequestOptions): Promise<EntitySchemaResponse> {
        const response = await this.client.get('users/@schema', buildRequestConfig(options));

        return response.data;
    }

    async getMany(
        options?: EntityQueryInput<User>,
        requestOptions?: APIRequestOptions,
    ): Promise<EntityCollectionResponse<User>> {
        const response = await this.client
            .get(`users${buildQueryString(options)}`, buildRequestConfig(requestOptions));

        return response.data;
    }

    async getOne(
        id: User['id'],
        options?: EntityQueryInput<User>,
        requestOptions?: APIRequestOptions,
    ): Promise<EntityRecordResponse<User>> {
        const response = await this.client
            .get(`users/${id}${buildQueryString(options)}`, buildRequestConfig(requestOptions));

        return response.data;
    }

    async delete(
        id: User['id'],
        options?: APIRequestOptions,
    ): Promise<EntityRecordResponse<User>> {
        const response = await this.client
            .delete(`users/${id}`, buildRequestConfig(options));

        return response.data;
    }

    async create(
        data: UserCreatePayload,
        options?: APIRequestOptions,
    ): Promise<EntityRecordResponse<User>> {
        const response = await this.client
            .post('users', nullifyEmptyObjectProperties(data), buildRequestConfig(options));

        return response.data;
    }

    async update(
        id: User['id'],
        data: UserUpdatePayload,
        options?: APIRequestOptions,
    ): Promise<EntityRecordResponse<User>> {
        const response = await this.client.post(`users/${id}`, nullifyEmptyObjectProperties(data), buildRequestConfig(options));

        return response.data;
    }

    async createOrUpdate(
        idOrName: string,
        data: UserSavePayload,
        options?: APIRequestOptions,
    ): Promise<EntityRecordResponse<User>> {
        const response = await this.client.put(`users/${idOrName}`, nullifyEmptyObjectProperties(data), buildRequestConfig(options));

        return response.data;
    }

    // ---------------------------------------------------------------------------

    async activate(
        token: string,
        options?: APIRequestOptions,
    ): Promise<ActivateResponse> {
        const response = await this.client.post('activate', { token }, buildRequestConfig(options));

        return response.data;
    }

    async register(
        data: RegisterPayload,
        options?: APIRequestOptions,
    ): Promise<RegisterResponse> {
        const response = await this.client.post('register', nullifyEmptyObjectProperties(data), buildRequestConfig(options));

        return response.data;
    }

    async passwordForgot(
        data: PasswordForgotPayload,
        options?: APIRequestOptions,
    ) : Promise<PasswordForgotResponse> {
        const response = await this.client.post('password-forgot', nullifyEmptyObjectProperties(data), buildRequestConfig(options));

        return response.data;
    }

    async passwordReset(
        data: PasswordResetPayload,
        options?: APIRequestOptions,
    ) : Promise<PasswordResetResponse> {
        const response = await this.client.post('password-reset', nullifyEmptyObjectProperties(data), buildRequestConfig(options));

        return response.data;
    }
}
