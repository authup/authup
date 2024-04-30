/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { OAuth2SubKind } from '../constants';

export function getOAuth2SubKindByEntity<T extends {
    robot_id: string | null,
    user_id: string | null
    client_id: string | null
}>(entity: T) : OAuth2SubKind {
    if (entity.robot_id) {
        return OAuth2SubKind.ROBOT;
    }

    if (entity.user_id) {
        return OAuth2SubKind.USER;
    }

    return OAuth2SubKind.CLIENT;
}
