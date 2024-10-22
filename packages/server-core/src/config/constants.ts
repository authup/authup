/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export enum ConfigDefaults {
    PORT = 3001,
    HOST = '0.0.0.0',

    AUTHORIZE_REDIRECT_URL = 'http://localhost:3000',

    TOKEN_REFRESH_MAG_AGE = 259_200,
    TOKEN_ACCESS_MAX_AGE = 3_600,
}
