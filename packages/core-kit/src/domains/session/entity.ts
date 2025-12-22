/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Client } from '../client';
import type { Realm } from '../realm';
import type { User } from '../user';
import type { Robot } from '../robot';

export interface Session {
    /**
     * Public ID
     */
    id: string;

    /**
     * Expiration date (iso)
     */
    expires: string,

    /**
     * Subject ID
     */
    sub: string,

    /**
     * Subject kind (e.g. user, robot, client)
     */
    sub_kind: string,

    /**
     * Last used ip address.
     */
    ip_address: string,

    /**
     * Last used user agent.
     */
    user_agent: string,

    // ------------------------------------------------------------------

    /**
     * Creation date of session
     */
    created_at: string,

    /**
     * Last time new access-token, refresh-token created for session.
     */
    updated_at: string,

    // ------------------------------------------------------------------

    client_id: Client['id'] | null;

    client: Client | null;

    user_id: User['id'] | null,

    user: User | null,

    robot_id: Robot['id'] | null,

    robot: Robot | null,

    realm_id: Realm['id'];

    realm: Realm;
}
