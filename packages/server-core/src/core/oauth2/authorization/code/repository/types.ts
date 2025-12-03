/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2AuthorizationCode } from '@authup/core-kit';

export interface IOAuth2AuthorizationCodeRepository {
    findOneById(id: string) : Promise<OAuth2AuthorizationCode | null>;

    save(input: OAuth2AuthorizationCode) : Promise<OAuth2AuthorizationCode>;
}
