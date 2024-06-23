/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { REALM_MASTER_NAME } from '@authup/core-kit';
import type { Request } from 'routup';
import { useRequestEnv } from '../../utils';

export function isRequestMasterRealm(req: Request) : boolean {
    const realm = useRequestEnv(req, 'realm');
    if (!realm) {
        return false;
    }

    return realm.name === REALM_MASTER_NAME;
}
