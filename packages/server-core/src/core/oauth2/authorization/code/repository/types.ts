/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2AuthorizationCode } from '@authup/core-kit';

export type OAuth2AuthorizationCodeRepositorySaveOptions = {
    maxAge?: number
};

export type OAuth2AuthorizationCodeInput = Omit<OAuth2AuthorizationCode, 'id'> & {
    id?: string
};

export interface IOAuth2AuthorizationCodeRepository {
    removeById(id: string): Promise<void>;

    remove(entity: OAuth2AuthorizationCode): Promise<void>;

    findOneById(id: string) : Promise<OAuth2AuthorizationCode | null>;

    save(
        input: OAuth2AuthorizationCodeInput,
        options?: OAuth2AuthorizationCodeRepositorySaveOptions
    ) : Promise<OAuth2AuthorizationCode>;
}
