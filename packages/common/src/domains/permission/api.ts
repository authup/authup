/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuildInput, buildQuery } from '@trapi/query';
import {
    APIType, CollectionResourceResponse, SingleResourceResponse, useAPI,
} from '../../http';
import { Permission } from './entity';

export async function getAPIPermissions(data?: BuildInput<Permission>) : Promise<CollectionResourceResponse<Permission>> {
    const response = await useAPI(APIType.DEFAULT).get(`permissions${buildQuery(data)}`);
    return response.data;
}

export async function addAPIPermission(data: Pick<Permission, 'id'>) : Promise<SingleResourceResponse<Permission>> {
    const response = await useAPI(APIType.DEFAULT).post('permissions', data);

    return response.data;
}

export async function editAPIPermission(id: typeof Permission.prototype.id, data: Pick<Permission, 'id'>) : Promise<SingleResourceResponse<Permission>> {
    const response = await useAPI(APIType.DEFAULT).post(`permissions/${id}`, data);

    return response.data;
}
