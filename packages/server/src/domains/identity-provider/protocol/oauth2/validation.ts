/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2IdentityProviderBase } from '@authup/common';
import zod from 'zod';

const schema = zod.object({
    scope: zod.string().min(3).max(2000).optional()
        .nullable(),
    client_id: zod.string().min(3).max(128),
    client_secret: zod.string().min(3).max(128).optional()
        .nullable(),

    token_url: zod.string().url(),
    token_revoke_url: zod.string().url().optional().nullable(),
    authorize_url: zod.string().url(),
    user_info_url: zod.string().url().optional().nullable(),
});

export function validateOAuth2IdentityProviderProtocol<
    T extends Partial<OAuth2IdentityProviderBase>,
>(entity: T) : T {
    const result = schema.safeParse(entity);
    if (result.success === false) {
        throw result.error;
    }

    return entity;
}
