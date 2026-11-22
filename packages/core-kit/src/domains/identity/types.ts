/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Client } from '../client/index.ts';
import type { User } from '../user/index.ts';
import type { IdentityType } from './constants.ts';

export type ClientIdentity = {
    type: `${IdentityType.CLIENT}`,
    data: Client
};
export type UserIdentity = {
    type: `${IdentityType.USER}`,
    data: User
};

export type Identity = ClientIdentity | UserIdentity;
