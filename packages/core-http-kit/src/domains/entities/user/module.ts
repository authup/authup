/*
 * Copyright (c) 2021-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { BuildInput } from 'rapiq';
import { buildQuery } from 'rapiq';
import type { User } from '@authup/core-kit';
import { nullifyEmptyObjectProperties } from '../../../utils';
import { BaseAPI } from '../../base';
import type { EntityAPI, EntityCollectionResponse, EntityRecordResponse } from '../../types-base';
import type {
    ActivateResponse,
    PasswordForgotInput,
    PasswordForgotResponse,
    PasswordResetInput,
    PasswordResetResponse,
    RegisterInput,
    RegisterResponse,
    UserCreateInput,
    UserResponse,
    UserSaveInput,
    UserUpdateInput,
} from './types';

export class UserAPI extends BaseAPI implements EntityAPI<User> {
    async getMany(
        options?: BuildInput<User>,
    ): Promise<EntityCollectionResponse<UserResponse>> {
        const response = await this.client
            .get(`users${buildQuery(options)}`);

        return response.data;
    }

    async getOne(
        id: User['id'],
        options?: BuildInput<User>,
    ): Promise<EntityRecordResponse<UserResponse>> {
        const response = await this.client
            .get(`users/${id}${buildQuery(options)}`);

        return response.data;
    }

    async delete(
        id: User['id'],
    ): Promise<EntityRecordResponse<UserResponse>> {
        const response = await this.client
            .delete(`users/${id}`);

        return response.data;
    }

    async create(
        data: UserCreateInput,
    ): Promise<EntityRecordResponse<UserResponse>> {
        const response = await this.client
            .post('users', nullifyEmptyObjectProperties(data));

        return response.data;
    }

    async update(
        id: User['id'],
        data: UserUpdateInput,
    ): Promise<EntityRecordResponse<UserResponse>> {
        const response = await this.client.post(`users/${id}`, nullifyEmptyObjectProperties(data));

        return response.data;
    }

    async createOrUpdate(
        idOrName: string,
        data: UserSaveInput,
    ): Promise<EntityRecordResponse<UserResponse>> {
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
        data: RegisterInput,
    ): Promise<RegisterResponse> {
        const response = await this.client.post('register', nullifyEmptyObjectProperties(data));

        return response.data;
    }

    async passwordForgot(
        data: PasswordForgotInput,
    ) : Promise<PasswordForgotResponse> {
        const response = await this.client.post('password-forgot', nullifyEmptyObjectProperties(data));

        return response.data;
    }

    async passwordReset(
        data: PasswordResetInput,
    ) : Promise<PasswordResetResponse> {
        const response = await this.client.post('password-reset', nullifyEmptyObjectProperties(data));

        return response.data;
    }
}
