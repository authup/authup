/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export enum AuthClientType {
    SERVICE = 'service',
    USER = 'user',
}

export enum AuthClientCommand {
    SECRET_SYNC = 'syncSecret',
    SECRET_REFRESH = 'refreshSecret',
}

export type ClientCommandType = `${AuthClientCommand}`;
