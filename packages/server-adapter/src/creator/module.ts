/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { AuthenticatorVariation } from './constants';
import {
    createTokenCreatorWithRobot,
    createTokenCreatorWithRobotInVault,
    createTokenCreatorWithUser,
} from './variations';
import type {
    TokenCreator,
    TokenCreatorOptions,
} from './type';

export function createTokenCreator(options: TokenCreatorOptions) : TokenCreator {
    switch (options.type) {
        case AuthenticatorVariation.USER: {
            return createTokenCreatorWithUser(options);
        }
        case AuthenticatorVariation.ROBOT: {
            return createTokenCreatorWithRobot(options);
        }
        case AuthenticatorVariation.ROBOT_IN_VAULT: {
            return createTokenCreatorWithRobotInVault(options);
        }
    }

    return undefined;
}
