/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuildInput, buildQuery } from '@trapi/query';
import { OAuth2Provider } from './entity';
import {
    APIType, CollectionResourceResponse, SingleResourceResponse, useAPI,
} from '../../http';
import { nullifyEmptyObjectProperties } from '../../utils';

export function getProviderAuthorizeUri(id: typeof OAuth2Provider.prototype.id) : string {
    const baseUrl: string = useAPI(APIType.DEFAULT).config.baseURL ?? '';

    return `${baseUrl}providers/${id}/authorize-url`;
}

export async function getAPIProviders(record?: BuildInput<OAuth2Provider>) : Promise<CollectionResourceResponse<OAuth2Provider>> {
    const response = await useAPI(APIType.DEFAULT).get(`providers${buildQuery(record)}`);

    return response.data;
}

export async function getAPIProvider(
    id: typeof OAuth2Provider.prototype.id,
    record?: BuildInput<OAuth2Provider>,
) : Promise<SingleResourceResponse<OAuth2Provider>> {
    const response = await useAPI(APIType.DEFAULT).get(`providers/${id}${buildQuery(record)}`);

    return response.data;
}

export async function dropAPIProvider(id: typeof OAuth2Provider.prototype.id) : Promise<SingleResourceResponse<OAuth2Provider>> {
    const response = await useAPI(APIType.DEFAULT).delete(`providers/${id}`);

    return response.data;
}

export async function addAPIProvider(data: Partial<OAuth2Provider>): Promise<SingleResourceResponse<OAuth2Provider>> {
    const response = await useAPI(APIType.DEFAULT).post('providers', nullifyEmptyObjectProperties(data));

    return response.data;
}

export async function editAPIProvider(userId: number, data: Partial<OAuth2Provider>): Promise<SingleResourceResponse<OAuth2Provider>> {
    const response = await useAPI(APIType.DEFAULT).post(`providers/${userId}`, nullifyEmptyObjectProperties(data));

    return response.data;
}
