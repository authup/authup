/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { User } from '../user';

export interface OAuth2Client {
    id: string,

    secret: string,

    redirect_url: string | null,

    grant_types: string | null,

    scope: string | null,

    is_confidential: boolean

    // ------------------------------------------------------------------

    user_id: User['id'] | null,

    user: User | null
}
