/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2TokenGrantResponse } from '@authup/specs';
import type { ClientError } from 'hapic';
import type { TokenCreator } from '../token-creator/index.ts';
import type { ClientAuthenticationHookEventName } from './constants.ts';

export type ClientAuthenticationHookOptions = {
    /**
     * @deprecated Ignored: the hook acts on the clients attached to it. Will be removed.
     */
    baseURL?: string,
    /**
     * Whether to set a timer to refresh the access token?
     *
     * default: true
     */
    timer?: boolean,
    /**
     * Whether to refresh the access token and retry a request the
     * server refused as unauthenticated. Without it, the request rejects
     * with its own error and the hook neither refreshes nor unsets its
     * header. Turn it off where a rotated refresh token cannot be persisted,
     * e.g. during a server render.
     *
     * default: true
     */
    retry?: boolean,
    /**
     * Fn to create a new token, if the previous token expired.
     */
    tokenCreator: TokenCreator,
};

export type ClientAuthenticationHookEvents = {
    [ClientAuthenticationHookEventName.REFRESH_FINISHED]: OAuth2TokenGrantResponse,
    [ClientAuthenticationHookEventName.REFRESH_FAILED]: ClientError | null,

    [ClientAuthenticationHookEventName.HEADER_SET]: []
    [ClientAuthenticationHookEventName.HEADER_UNSET]: []
};
