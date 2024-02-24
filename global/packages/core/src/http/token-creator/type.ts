/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { TokenGrantResponse } from '@hapic/oauth2';
import type { TokenCreatorVariation } from './constants';

export type TokenCreatorCreatedHook = (response: TokenGrantResponse) => void;
export type TokenCreatorFailedHook = (e: Error) => void;

export type TokenCreatorBaseOptions = {
    baseURL?: string,
    created?: TokenCreatorCreatedHook,
    failed?: TokenCreatorFailedHook
};

export type TokenCreatorUserOptions = TokenCreatorBaseOptions & {
    type: `${TokenCreatorVariation.USER}`,
    name: string,
    password: string,
    realmId?: string,
    realmName?: string,
};

export type TokenCreatorRobotOptions = TokenCreatorBaseOptions & {
    type: `${TokenCreatorVariation.ROBOT}`,
    id: string,
    secret: string,
};

export type TokenCreatorOptions = TokenCreatorUserOptions | TokenCreatorRobotOptions;
export type TokenCreator = () => Promise<TokenGrantResponse>;
