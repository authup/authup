/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { User } from '../user';

export interface AttemptLogin {
    id: string,

    ip_address: string,

    user_agent: string,

    email: string,

    success: boolean,

    user: User,

    user_id: User['id'],

    created_at: Date | string,

    updated_at: Date | string,
}
