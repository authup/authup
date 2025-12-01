/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Robot } from '../robot';
import type { User } from '../user';
import type { Client } from '../client';
import type { Realm } from '../realm';

export interface OAuth2AuthorizationCode {
    id: string,

    code_challenge?: string | null,

    code_challenge_method?: string | null,

    scope?: string | null,

    redirect_uri?: string | null,

    id_token?: string | null,

    client_id?: Client['id'] | null,

    user_id?: User['id'] | null,

    robot_id?: Robot['id'] | null,

    realm_id: Realm['id'],

    realm_name: Realm['name'],

    exp?: number
}

export type OAuth2AuthorizationCodeRequest = {
    response_type: string,
    client_id: string,
    realm_id?: string,
    redirect_uri: string,
    scope?: string,
    state?: string,
    code_challenge?: string,
    code_challenge_method?: string,
};
