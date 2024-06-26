/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2AuthorizationResponseType } from '@authup/kit';
import type { User } from '../user';
import type { Client } from '../client';
import type { Realm } from '../realm';

export interface OAuth2AuthorizationCode {
    id: string,

    content: string,

    expires: string,

    scope: string | null,

    redirect_uri: string | null,

    id_token: string | null,

    client_id: Client['id'] | null,

    client: Client | null,

    user_id: User['id'] | null,

    user: User | null,

    realm_id: Realm['id'],

    realm: Realm,
}

export type OAuth2AuthorizationCodeRequest = {
    response_type?: `${OAuth2AuthorizationResponseType}`,
    client_id?: string,
    redirect_uri?: string,
    scope?: string,
    state?: string
};
