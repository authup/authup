/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { OAuth2IdentityProviderBase } from '@authelion/common';
import zod from 'zod';
import { BadRequestError } from '@typescript-error/http';

const validationSchema = zod.object({
    token_url: zod.string().url(),
    token_revoke_url: zod.string().url().optional().nullable(),
    authorize_url: zod.string().url(),
    user_info_url: zod.string().url().optional().nullable(),
    scope: zod.string().min(3).max(2000).optional()
        .nullable(),
    client_id: zod.string().min(3).max(128),
    client_secret: zod.string().min(3).max(128).optional()
        .nullable(),
});

export function validateOAuth2IdentityProviderProtocol<
    T extends Partial<OAuth2IdentityProviderBase>,
>(entity: T) : T {
    const result = validationSchema.safeParse(entity);
    if (result.success === false) {
        throw new BadRequestError(result.error.message);
    }

    return entity;
}
