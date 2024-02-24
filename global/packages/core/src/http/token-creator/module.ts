/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { TokenCreatorVariation } from './constants';
import {
    createTokenCreatorWithRobot,
    createTokenCreatorWithUser,
} from './variations';
import type {
    TokenCreator,
    TokenCreatorOptions,
} from './type';

export function createTokenCreator(options: TokenCreatorOptions) : TokenCreator {
    switch (options.type) {
        case TokenCreatorVariation.USER: {
            return createTokenCreatorWithUser(options);
        }
        case TokenCreatorVariation.ROBOT: {
            return createTokenCreatorWithRobot(options);
        }
    }

    return undefined;
}
