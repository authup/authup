/*
 * Copyright (c) 2021-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ClientDriverInstance } from '@trapi/client';
import { nullifyEmptyObjectProperties } from '../../utils';
import { OAuth2GrantPayload, OAuth2TokenGrantResponse, OAuth2TokenIntrospectionResponse } from './type';
import { SingleResourceResponse } from '../type';

export class OAuth2API {
    protected client: ClientDriverInstance;

    constructor(client: ClientDriverInstance) {
        this.client = client;
    }

    async verifyToken(token: string): Promise<SingleResourceResponse<OAuth2TokenIntrospectionResponse>> {
        const response = await this.client.post('token', { token });

        return response.data;
    }

    async deleteToken(): Promise<void> {
        const response = await this.client.delete('token');

        return response.data;
    }

    async createToken(data: OAuth2GrantPayload): Promise<SingleResourceResponse<OAuth2TokenGrantResponse>> {
        const response = await this.client.post('token', nullifyEmptyObjectProperties(data));

        return response.data;
    }
}
