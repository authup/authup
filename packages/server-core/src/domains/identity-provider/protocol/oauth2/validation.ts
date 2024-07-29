/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IdentityProviderPreset, OAuth2IdentityProvider } from '@authup/core-kit';
import zod from 'zod';
import { extractOAuth2IdentityProviderProtocolAttributes } from './extract';

const protocolSchema = zod.object({
    client_id: zod.string().min(3).max(128),
    client_secret: zod.string().min(3).max(128).optional()
        .nullable(),
});

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

export function validateOAuth2IdentityProviderProtocol(
    body: Record<string, any>,
    protocolConfig: `${IdentityProviderPreset}`,
) : Partial<OAuth2IdentityProvider> {
    const attributes = extractOAuth2IdentityProviderProtocolAttributes(body);

    if (protocolConfig) {
        const result = protocolSchema.safeParse(attributes);
        if (result.success === false) {
            throw result.error;
        }

        return result.data;
    }

    const result = schema.safeParse(attributes);
    if (result.success === false) {
        throw result.error;
    }

    return result.data;
}
