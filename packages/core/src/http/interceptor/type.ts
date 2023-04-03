/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { TokenCreator, TokenCreatorOptions } from '../token-creator';

export type TokenInterceptorOptions = {
    baseUrl?: string,
    tokenCreator: TokenCreatorOptions | TokenCreator
};
