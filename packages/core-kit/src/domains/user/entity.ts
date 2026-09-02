/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Realm } from '../realm';

export interface User {
    id: string;

    name: string;

    nameLocked: boolean;

    firstName: string | null;

    lastName: string | null;

    displayName: string | null;

    email: string;

    /**
     * Whether control of `email` was proven, by following the code mailed
     * to it. Deliberately NOT derived from `active`, which is the account's
     * enable flag and says nothing about the address (#3519).
     */
    emailVerified: boolean;

    password: string | null;

    // ------------------------------------------------------------------

    avatar: string | null;

    cover: string | null;

    // ------------------------------------------------------------------

    resetHash: string | null;

    resetAt: string | null;

    resetExpires: string | null;

    // ------------------------------------------------------------------

    status: string | null;

    statusMessage: string | null;

    // ------------------------------------------------------------------

    active: boolean;

    activateHash: string | null;

    // ------------------------------------------------------------------

    createdAt: string;

    updatedAt: string;

    // ------------------------------------------------------------------

    realmId: Realm['id'];

    realm: Realm;

    // ------------------------------------------------------------------

    [key: string]: any
}
