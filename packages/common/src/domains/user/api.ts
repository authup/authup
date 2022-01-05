/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuildInput, buildQuery } from '@trapi/query';
import {
    APIType, CollectionResourceResponse, SingleResourceResponse, useAPI,
} from '../../http';
import { nullifyEmptyObjectProperties } from '../../utils';
import { User } from './entity';

export async function getAPIUsers(
    options?: BuildInput<User>,
) : Promise<CollectionResourceResponse<User>> {
    const response = await useAPI(APIType.DEFAULT)
        .get(`users${buildQuery(options)}`);

    return response.data;
}

export async function getAPIUser(
    id: typeof User.prototype.id,
    options?: BuildInput<User>,
) : Promise<SingleResourceResponse<User>> {
    const response = await useAPI(APIType.DEFAULT)
        .get(`users/${id}${buildQuery(options)}`);

    return response.data;
}

export async function dropAPIUser(
    id: typeof User.prototype.id,
) : Promise<SingleResourceResponse<User>> {
    const response = await useAPI(APIType.DEFAULT)
        .delete(`users/${id}`);

    return response.data;
}

export async function addAPIUser(
    data: Partial<User>,
) : Promise<SingleResourceResponse<User>> {
    const response = await useAPI(APIType.DEFAULT)
        .post('users', nullifyEmptyObjectProperties(data));

    return response.data;
}

export async function editAPIUser(
    id: typeof User.prototype.id,
    data: Partial<User> & {password_repeat: typeof User.prototype.password},
) : Promise<SingleResourceResponse<User>> {
    const response = await useAPI(APIType.DEFAULT).post(`users/${id}`, nullifyEmptyObjectProperties(data));

    return response.data;
}
