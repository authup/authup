/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Client } from '../client';
import type { Robot } from '../robot';
import type { User } from '../user';
import type { IdentityType } from './constants';
import type { IdentityProvider } from '../identity-provider';

export type ClientIdentity = {
    type: `${IdentityType.CLIENT}`,
    data: Client,
    provider?: IdentityProvider
};
export type RobotIdentity = {
    type: `${IdentityType.ROBOT}`,
    data: Robot
    provider?: IdentityProvider
};
export type UserIdentity = {
    type: `${IdentityType.USER}`,
    data: User
    provider?: IdentityProvider
};

export type Identity = ClientIdentity | RobotIdentity | UserIdentity;
