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
import { Oauth2ProviderRole } from './entity';

export async function getApiOauth2ProviderRoles(data: BuildInput<Oauth2ProviderRole>) : Promise<CollectionResourceResponse<Oauth2ProviderRole>> {
    const response = await useAPI(APIType.DEFAULT).get(`provider-roles${buildQuery(data)}`);

    return response.data;
}

export async function getApiOauth2ProviderRole(id: typeof Oauth2ProviderRole.prototype.id) : Promise<SingleResourceResponse<Oauth2ProviderRole>> {
    const response = await useAPI(APIType.DEFAULT).get(`provider-roles/${id}`);

    return response.data;
}

export async function dropAPIOauth2ProviderRole(id: typeof Oauth2ProviderRole.prototype.id) : Promise<SingleResourceResponse<Oauth2ProviderRole>> {
    const response = await useAPI(APIType.DEFAULT).delete(`provider-roles/${id}`);

    return response.data;
}

export async function addAPIOauth2ProviderRole(data: Partial<Oauth2ProviderRole>) : Promise<SingleResourceResponse<Oauth2ProviderRole>> {
    const response = await useAPI(APIType.DEFAULT).post('provider-roles', nullifyEmptyObjectProperties(data));

    return response.data;
}

export async function editAPIOauth2ProviderRole(
    id: typeof Oauth2ProviderRole.prototype.id,
    data: Partial<Oauth2ProviderRole>,
) : Promise<SingleResourceResponse<Oauth2ProviderRole>> {
    const response = await useAPI(APIType.DEFAULT).post(`provider-roles/${id}`, data);

    return response.data;
}
