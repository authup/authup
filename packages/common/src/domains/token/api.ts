/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Oauth2TokenResponse } from '@typescript-auth/core';
import { APIType, SingleResourceResponse, useAPI } from '../../http';
import { nullifyEmptyObjectProperties } from '../../utils';
import { TokenGrantPayload, TokenVerificationPayload } from './type';

export async function verifyAPIToken(token: number) : Promise<SingleResourceResponse<TokenVerificationPayload>> {
    const response = await useAPI(APIType.DEFAULT).get(`token/${token}`);

    return response.data;
}

export async function revokeAPIToken() : Promise<void> {
    const response = await useAPI(APIType.DEFAULT).delete('token');

    return response.data;
}

export async function grantAPIToken(data: TokenGrantPayload) : Promise<SingleResourceResponse<Oauth2TokenResponse>> {
    const response = await useAPI(APIType.DEFAULT).post('token', nullifyEmptyObjectProperties(data));

    return response.data;
}
