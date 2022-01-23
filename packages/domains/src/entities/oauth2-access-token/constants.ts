/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export enum OAuth2AccessTokenGrant {
    PASSWORD = 'password',
    ROBOT_CREDENTIALS = 'robot_credentials',
    REFRESH_TOKEN = 'refresh_token',
}

export enum OAuth2TokenSubKind {
    USER = 'user',
    ROBOT = 'robot',
}
