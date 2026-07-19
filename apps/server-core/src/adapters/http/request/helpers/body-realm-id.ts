/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isUUID } from '@authup/kit';

export function getBodyRealmID(body: Record<string, any> | undefined) : string | undefined {
    const realmId = body?.realmId;
    if (typeof realmId !== 'string') {
        return undefined;
    }

    if (!isUUID(realmId)) {
        return undefined;
    }

    return realmId;
}
