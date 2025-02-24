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

export class UserAPI extends BaseAPI implements EntityAPI<User> {
    async getMany(
        options?: BuildInput<User>,
    ): Promise<EntityCollectionResponse<User>> {
        const response = await this.client
            .get(`users${buildQuery(options)}`);

        return response.data;
    }

    async getOne(
        id: User['id'],
        options?: BuildInput<User>,
    ): Promise<EntityRecordResponse<User>> {
        const response = await this.client
            .get(`users/${id}${buildQuery(options)}`);

        return response.data;
    }

    async delete(
        id: User['id'],
    ): Promise<EntityRecordResponse<User>> {
        const response = await this.client
            .delete(`users/${id}`);

        return response.data;
    }

    async create(
        data: Partial<User>,
    ): Promise<EntityRecordResponse<User>> {
        const response = await this.client
            .post('users', nullifyEmptyObjectProperties(data));

        return response.data;
    }

    async update(
        id: User['id'],
        data: Partial<User> & { password_repeat?: User['password'] },
    ): Promise<EntityRecordResponse<User>> {
        const response = await this.client.post(`users/${id}`, nullifyEmptyObjectProperties(data));

        return response.data;
    }

    async createOrUpdate(
        idOrName: string,
        data: Partial<User> & { password_repeat?: User['password'] },
    ): Promise<EntityRecordResponse<User>> {
        const response = await this.client.put(`users/${idOrName}`, nullifyEmptyObjectProperties(data));

        return response.data;
    }

    // ---------------------------------------------------------------------------

    async activate(
        token: string,
    ): Promise<User> {
        const response = await this.client.post('users/activate', {
            token,
        });

        return response.data;
    }

    async register(
        data: Partial<Pick<User, 'email' | 'name' | 'password' | 'realm_id'>>,
    ): Promise<User> {
        const response = await this.client.post('users/register', nullifyEmptyObjectProperties(data));

        return response.data;
    }

    async passwordForgot(
        data: Partial<Pick<User, 'email' | 'name' | 'realm_id'>>,
    ) : Promise<User> {
        const response = await this.client.post('users/password-forgot', nullifyEmptyObjectProperties(data));

        return response.data;
    }

    async passwordReset(
        data: Partial<Pick<User, 'email' | 'name' | 'realm_id'>> &
        { token: string, password: string },
    ) : Promise<User> {
        const response = await this.client.post('users/password-reset', nullifyEmptyObjectProperties(data));

        return response.data;
    }
}
