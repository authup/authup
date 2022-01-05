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
import { Role } from './entity';

export async function getAPIRoles(data?: BuildInput<Role>) : Promise<CollectionResourceResponse<Role>> {
    const response = await useAPI(APIType.DEFAULT).get(`roles${buildQuery(data)}`);

    return response.data;
}

export async function getAPIRole(roleId: number) : Promise<SingleResourceResponse<Role>> {
    const response = await useAPI(APIType.DEFAULT).get(`roles/${roleId}`);

    return response.data;
}

export async function dropAPIRole(roleId: number) : Promise<SingleResourceResponse<Role>> {
    const response = await useAPI(APIType.DEFAULT).delete(`roles/${roleId}`);

    return response.data;
}

export async function addAPIRole(data: Pick<Role, 'name'>) : Promise<SingleResourceResponse<Role>> {
    const response = await useAPI(APIType.DEFAULT).post('roles', nullifyEmptyObjectProperties(data));

    return response.data;
}

export async function editAPIRole(id: number, data: Pick<Role, 'name'>) : Promise<SingleResourceResponse<Role>> {
    const response = await useAPI(APIType.DEFAULT).post(`roles/${id}`, nullifyEmptyObjectProperties(data));

    return response.data;
}
