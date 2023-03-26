/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { AbilityManager, OAuth2SubKind } from '@authup/common';
import type { OAuth2TokenIntrospectionResponse } from '@authup/common';

export function applyOAuth2IntrospectionResponse(
    target: Record<string, any>,
    data: OAuth2TokenIntrospectionResponse,
) {
    switch (data.sub_kind) {
        case OAuth2SubKind.CLIENT:
            target.clientId = data.sub;
            target.clientName = data.sub_name;
            target.client = { id: target.clientId, name: target.clientName };
            break;
        case OAuth2SubKind.ROBOT:
            target.robotId = data.sub;
            target.robotName = data.sub_name;
            target.robot = { id: target.robotId, name: target.robotName };
            break;
        case OAuth2SubKind.USER:
            target.userId = data.sub;
            target.userName = data.sub_name;
            target.user = { id: target.userId, name: target.userName };
            break;
    }

    target.realmId = data.realm_id;
    target.realmName = data.realm_name;
    target.realm = { id: target.realmId, name: target.realmName };

    target.ability = new AbilityManager(data.permissions);
}
