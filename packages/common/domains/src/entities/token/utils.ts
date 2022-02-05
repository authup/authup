/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { TokenMaxAgeType } from './type';

export function determineAccessTokenMaxAge(maxAge?: TokenMaxAgeType) : number {
    maxAge = maxAge || 3600;

    if (typeof maxAge === 'number') {
        return maxAge;
    }

    return maxAge.accessToken || 3600;
}

export function determineRefreshTokenMaxAge(maxAge?: TokenMaxAgeType) : number {
    // refresh_token should by default have the 10x lifespan of access-token
    maxAge = maxAge || 3600 * 10;

    if (typeof maxAge === 'number') {
        return maxAge;
    }

    return maxAge.refreshToken || determineAccessTokenMaxAge(maxAge) * 10;
}
