/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { faker } from '@faker-js/faker';
import { IdentityProviderProtocol, type OAuth2IdentityProvider } from '@authup/core-kit';

export function createFakeOAuth2IdentityProvider(data: Partial<OAuth2IdentityProvider> = {}) {
    return {
        name: faker.string.alpha({ length: 16, casing: 'lower' }),
        display_name: faker.internet.displayName(),
        enabled: true,
        protocol: IdentityProviderProtocol.OAUTH2,
        client_id: faker.internet.username(),
        client_secret: faker.string.alphanumeric({ length: 64 }),
        token_url: faker.internet.url(),
        authorize_url: faker.internet.url(),
        ...data,
    } satisfies Partial<OAuth2IdentityProvider>;
}
