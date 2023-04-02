/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { TokenGrantResponse } from '@hapic/oauth2';
import type { Client } from '@hapic/vault';
import type { AuthenticatorVariation } from './constants';

export type TokenCreatorBaseOptions = {
    baseUrl?: string
};

export type TokenCreatorUserOptions = TokenCreatorBaseOptions & {
    type: `${AuthenticatorVariation.USER}`,
    name: string,
    password: string,
    realmId?: string,
    realmName?: string,
};

export type TokenCreatorRobotOptions = TokenCreatorBaseOptions & {
    type: `${AuthenticatorVariation.ROBOT}`,
    id: string,
    secret: string,
};

export type TokenCreatorRobotInVaultOptions = TokenCreatorBaseOptions & {
    type: `${AuthenticatorVariation.ROBOT_IN_VAULT}`,
    /**
     * default: SYSTEM
     */
    name?: string,

    /**
     * connection string or vault client.
     */
    vault: string | Client,
};

export type TokenCreatorOptions = TokenCreatorUserOptions |
TokenCreatorRobotOptions |
TokenCreatorRobotInVaultOptions;

export type TokenCreator = () => Promise<TokenGrantResponse>;
