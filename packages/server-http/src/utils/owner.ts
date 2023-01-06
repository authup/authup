/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { REALM_MASTER_NAME, ROBOT_SYSTEM_NAME } from '@authup/common';
import { useConfig } from '@authup/server-database';
import { Request } from 'routup';
import { useRequestEnv } from './env';

export function isRequestSubOwner(req: Request) : boolean {
    const realm = useRequestEnv(req, 'realm');
    if (!realm || realm.name !== REALM_MASTER_NAME) {
        return false;
    }

    const config = useConfig();

    const user = useRequestEnv(req, 'user');
    if (
        user &&
        user.name === config.get('adminUsername')
    ) {
        return true;
    }

    const robot = useRequestEnv(req, 'robot');
    return robot &&
        robot.name === ROBOT_SYSTEM_NAME;
}
