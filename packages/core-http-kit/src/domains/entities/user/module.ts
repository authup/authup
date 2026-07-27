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
import type { EntityCollectionResponse, EntityRecordWrappedResponse } from '../../types-base';
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

export class UserAPI extends BaseAPI implements IUserAPI {
    async getMany(
        options?: EntityQueryInput<User>,
    ): Promise<EntityCollectionResponse<User>> {
        const response = await this.client
            .get(`users${buildQueryString(options)}`);

        return response.data;
    }

    async getOne(
        id: User['id'],
        options?: EntityQueryInput<User>,
    ): Promise<EntityRecordWrappedResponse<User>> {
        const response = await this.client
            .get(`users/${id}${buildQueryString(options)}`);

        return response.data;
    }

    async delete(
        id: User['id'],
    ): Promise<EntityRecordWrappedResponse<User>> {
        const response = await this.client
            .delete(`users/${id}`);

        return response.data;
    }

    async create(
        data: UserCreatePayload,
    ): Promise<EntityRecordWrappedResponse<User>> {
        const response = await this.client
            .post('users', nullifyEmptyObjectProperties(data));

        return response.data;
    }

    async update(
        id: User['id'],
        data: UserUpdatePayload,
    ): Promise<EntityRecordWrappedResponse<User>> {
        const response = await this.client.post(`users/${id}`, nullifyEmptyObjectProperties(data));

        return response.data;
    }

    async createOrUpdate(
        idOrName: string,
        data: UserSavePayload,
    ): Promise<EntityRecordWrappedResponse<User>> {
        const response = await this.client.put(`users/${idOrName}`, nullifyEmptyObjectProperties(data));

        return response.data;
    }

    // ---------------------------------------------------------------------------

    async activate(
        token: string,
    ): Promise<ActivateResponse> {
        const response = await this.client.post('activate', { token });

        return response.data;
    }

    async register(
        data: RegisterPayload,
    ): Promise<RegisterResponse> {
        const response = await this.client.post('register', nullifyEmptyObjectProperties(data));

        return response.data;
    }

    async passwordForgot(
        data: PasswordForgotPayload,
    ) : Promise<PasswordForgotResponse> {
        const response = await this.client.post('password-forgot', nullifyEmptyObjectProperties(data));

        return response.data;
    }

    async passwordReset(
        data: PasswordResetPayload,
    ) : Promise<PasswordResetResponse> {
        const response = await this.client.post('password-reset', nullifyEmptyObjectProperties(data));

        return response.data;
    }
}
