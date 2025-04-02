/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { TokenGrantResponse } from '@hapic/oauth2';
import type { ClientError } from 'hapic';
import type { TokenCreator, TokenCreatorOptions } from '../token-creator';
import type { ClientResponseTokenHookEventName } from './constants';

export type ClientResponseTokenHookOptions = {
    /**
     * The URL of the api service.
     *
     * default: client.baseURL
     */
    baseURL?: string,
    /**
     * Whether to set a timer to refresh the access token?
     *
     * default: true
     */
    timer?: boolean,
    /**
     * Fn to create a new token, if the previous token expired.
     */
    tokenCreator: TokenCreatorOptions | TokenCreator,
};

export type ClientResponseTokenHookEvents = {
    [ClientResponseTokenHookEventName.CREATED]: TokenGrantResponse,
    [ClientResponseTokenHookEventName.REFRESH_FAILED]: ClientError | null,
};
