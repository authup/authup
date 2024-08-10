/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isUUID } from '@authup/kit';
import { useRequestBody } from '@routup/basic/body';
import type { Request } from 'routup';

export function getRequestBodyRealmID(req: Request) : string | undefined {
    const realmId = useRequestBody(req, 'realm_id');
    if (typeof realmId !== 'string') {
        return undefined;
    }

    if (!isUUID(realmId)) {
        return undefined;
    }

    return realmId;
}
