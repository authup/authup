/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Oauth2TokenResponse } from '@typescript-auth/core';
import { AxiosInstance } from 'axios';
import { nullifyEmptyObjectProperties } from '../../utils';
import { TokenGrantPayload, TokenVerificationPayload } from './type';
import { SingleResourceResponse } from '../../http';

export class TokenAPIClient {
    protected client: AxiosInstance;

    constructor(client: AxiosInstance) {
        this.client = client;
    }

    async verify(token: number): Promise<SingleResourceResponse<TokenVerificationPayload>> {
        const response = await this.client.get(`token/${token}`);

        return response.data;
    }

    async delete(): Promise<void> {
        const response = await this.client.delete('token');

        return response.data;
    }

    async create(data: TokenGrantPayload): Promise<SingleResourceResponse<Oauth2TokenResponse>> {
        const response = await this.client.post('token', nullifyEmptyObjectProperties(data));

        return response.data;
    }
}
