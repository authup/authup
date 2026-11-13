/*
 * Copyright (c) 2021-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { EntityQueryInput } from '../../../helpers';
import { buildQueryString } from '../../../helpers';
import type { IdentityProvider, IdentityProviderAccount } from '@authup/core-kit';
import type { OAuth2TokenGrantResponse } from '@authup/specs';
import { buildIdentityProviderAuthorizePath } from '@authup/core-kit';
import { base64URLEncode } from '@authup/kit';
import { cleanDoubleSlashes, nullifyEmptyObjectProperties } from '../../../utils';
import type { APIRequestOptions, EntityCollectionResponse, EntityRecordResponse } from '../../types-base';
import { BaseAPI } from '../../base';
import { buildStatsURL } from '../../stats';
import type { EntitySchemaResponse, EntityStatsQuery, EntityStatsResponse } from '../../stats';
import type {
    IIdentityProviderAPI,
    IdentityProviderAuthorizeUriOptions,
    IdentityProviderCreatePayload,
    IdentityProviderLinkConfirmPayload,
    IdentityProviderLinkRequestResponse,
    IdentityProviderSavePayload,
    IdentityProviderUpdatePayload,
} from './types';
import { buildRequestConfig } from '../../utils';

export class IdentityProviderAPI extends BaseAPI implements IIdentityProviderAPI {
    async getStats(query: EntityStatsQuery<IdentityProvider> = {}, options?: APIRequestOptions): Promise<EntityStatsResponse> {
        const response = await this.client.get(buildStatsURL('identity-providers', query), buildRequestConfig(options));

        return response.data;
    }

    async getSchema(options?: APIRequestOptions): Promise<EntitySchemaResponse> {
        const response = await this.client.get('identity-providers/@schema', buildRequestConfig(options));

        return response.data;
    }

    getAuthorizeUri(id: IdentityProvider['id'], options: IdentityProviderAuthorizeUriOptions = {}): string {
        const url = cleanDoubleSlashes(`${this.client.getBaseURL()}/${buildIdentityProviderAuthorizePath(id)}`);

        if (options.codeRequest) {
            return `${url}?codeRequest=${base64URLEncode(JSON.stringify(options.codeRequest))}`;
        }

        if (options.userCode) {
            return `${url}?user_code=${encodeURIComponent(options.userCode)}`;
        }

        return url;
    }

    async createLinkRequest(id: IdentityProvider['id'], options?: APIRequestOptions): Promise<IdentityProviderLinkRequestResponse> {
        const response = await this.client.post(`identity-providers/${encodeURIComponent(id)}/link-request`, undefined, buildRequestConfig(options));

        return response.data;
    }

    async completeLogin(id: IdentityProvider['id'], options?: APIRequestOptions): Promise<OAuth2TokenGrantResponse> {
        // No payload: the pending login rides a cookie the callback set, which
        // the browser sends with this same-origin request.
        const response = await this.client.post(`identity-providers/${encodeURIComponent(id)}/login-complete`, undefined, buildRequestConfig(options));

        return response.data;
    }

    async confirmLinkRequest(
        id: IdentityProvider['id'],
        handle: string,
        options?: APIRequestOptions,
    ): Promise<EntityRecordResponse<IdentityProviderAccount>> {
        const payload : IdentityProviderLinkConfirmPayload = { handle };
        const response = await this.client.post(`identity-providers/${encodeURIComponent(id)}/link-confirm`, payload, buildRequestConfig(options));

        return response.data;
    }

    async getMany(record?: EntityQueryInput<IdentityProvider>, options?: APIRequestOptions): Promise<EntityCollectionResponse<IdentityProvider>> {
        const response = await this.client.get(`identity-providers${buildQueryString(record)}`, buildRequestConfig(options));

        return response.data;
    }

    async getOne(
        id: IdentityProvider['id'],
        record?: EntityQueryInput<IdentityProvider>,
        options?: APIRequestOptions,
    ): Promise<EntityRecordResponse<IdentityProvider>> {
        const response = await this.client.get(`identity-providers/${id}${buildQueryString(record)}`, buildRequestConfig(options));

        return response.data;
    }

    async delete(id: IdentityProvider['id'], options?: APIRequestOptions): Promise<EntityRecordResponse<IdentityProvider>> {
        const response = await this.client.delete(`identity-providers/${id}`, buildRequestConfig(options));

        return response.data;
    }

    async create(data: IdentityProviderCreatePayload, options?: APIRequestOptions): Promise<EntityRecordResponse<IdentityProvider>> {
        const response = await this.client.post('identity-providers', nullifyEmptyObjectProperties(data), buildRequestConfig(options));

        return response.data;
    }

    async update(id: IdentityProvider['id'], data: IdentityProviderUpdatePayload, options?: APIRequestOptions): Promise<EntityRecordResponse<IdentityProvider>> {
        const response = await this.client.post(`identity-providers/${id}`, nullifyEmptyObjectProperties(data), buildRequestConfig(options));

        return response.data;
    }

    async createOrUpdate(
        idOrName: string,
        data: IdentityProviderSavePayload,
        options?: APIRequestOptions,
    ): Promise<EntityRecordResponse<IdentityProvider>> {
        const response = await this.client.put(`identity-providers/${idOrName}`, nullifyEmptyObjectProperties(data), buildRequestConfig(options));

        return response.data;
    }
}
