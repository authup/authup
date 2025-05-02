/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PermissionItem } from '../permission';

export interface PolicyBase {
    /**
     * Invert evaluation result of policy (true->false and false->true)
     */
    invert?: boolean,
}

export type PolicyWithType<
    R extends Record<string, any> = Record<string, any>,
    T = string,
> = R & {
    type: T
};

export type PolicyIdentity = {
    /**
     * user, client, robot
     */
    type: string,
    /**
     * UUID
     */
    id: string,
    /**
     * Client associated with identity.
     */
    clientId?: string | null,
    /**
     * Realm id associated with identity.
     */
    realmId?: string | null,
    /**
     * Realm name associated with identity.
     */
    realmName?: string | null
};

export type PolicyInput = {
    /**
     * Permission for which the policy is evaluated.
     */
    permission?: PermissionItem,

    /**
     * Identity of the executing party.
     */
    identity?: PolicyIdentity,

    /**
     * Attributes
     */
    attributes?: Record<string, any>,

    /**
     * The dateTime to use for time & date policy.
     */
    dateTime?: Date | number | string,
    [key: string]: any
};
