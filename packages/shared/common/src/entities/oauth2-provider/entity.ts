/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Realm } from '../realm';

export interface OAuth2Provider {
    id: string;

    name: string;

    open_id: boolean;

    client_id: string;

    client_secret: string;

    token_host: string;

    token_path: string;

    token_revoke_path: string;

    authorize_host: string;

    authorize_path: string;

    user_info_host: string;

    user_info_path: string;

    scope: string;

    created_at: Date;

    updated_at: Date;

    realm_id: string;

    realm: Realm;
}
