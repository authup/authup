/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { User } from '../user';
import { Realm } from '../realm';

export interface OAuth2Client {
    id: string,

    secret: string,

    redirect_uri: string | null,

    grant_types: string | null,

    scope: string | null,

    is_confidential: boolean,

    // ------------------------------------------------------------------

    realm_id: Realm['id'],

    realm: Realm,

    user_id: User['id'] | null,

    user: User | null
}
