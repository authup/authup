/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OpenIDConnectIdentityProvider } from '@authup/common';
import zod from 'zod';
import {
    OAuth2IdentityProviderBaseSchema,
    OAuth2IdentityProviderSchema,
} from '../oauth2';

const schema = OAuth2IdentityProviderBaseSchema.merge(zod.object({
    discovery_endpoint: zod.string().url(),
})).or(OAuth2IdentityProviderSchema);

export function validateOidcIdentityProviderProtocol(
    entity: Partial<OpenIDConnectIdentityProvider>,
) : Partial<OpenIDConnectIdentityProvider> {
    const result = schema.safeParse(entity);
    if (result.success === false) {
        throw result.error;
    }

    return entity;
}
